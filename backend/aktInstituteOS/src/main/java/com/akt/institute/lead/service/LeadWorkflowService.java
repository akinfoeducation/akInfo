package com.akt.institute.lead.service;

import com.akt.institute.admission.domain.Admission;
import com.akt.institute.admission.repository.AdmissionDao;
import com.akt.institute.booking.domain.AdmissionBooking;
import com.akt.institute.booking.domain.BookingStatus;
import com.akt.institute.booking.repository.AdmissionBookingDao;
import com.akt.institute.lead.activity.service.LeadActivityService;
import com.akt.institute.lead.domain.*;
import com.akt.institute.lead.dto.*;
import com.akt.institute.lead.mapper.LeadMapper;
import com.akt.institute.lead.repository.LeadDao;
import com.akt.institute.lead.repository.LeadTransferDao;
import com.akt.institute.shared.exception.BusinessException;
import com.akt.institute.shared.exception.ResourceNotFoundException;
import com.akt.institute.shared.security.UserPrincipal;
import com.akt.institute.shared.util.DateTimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Core of the Action-Driven Workflow.
 *
 * Responsibilities:
 *   1. Validate that an action is permitted for the current lead state and actor role
 *   2. Resolve the resulting LeadStatus and LeadStage
 *   3. Apply the transition (mutate lead + stamp milestone timestamps)
 *   4. Log a structured activity entry
 *
 * The old LeadService.updateStatus() is kept for backward compatibility but
 * now requires LEAD_STATUS_OVERRIDE permission (admin escape hatch only).
 * All normal workflow transitions go through performAction().
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LeadWorkflowService {

    private final LeadDao                leadDao;
    private final LeadMapper             leadMapper;
    private final LeadActivityService    activityService;
    private final LeadTransferDao        transferDao;
    private final AdmissionDao           admissionDao;
    private final AdmissionBookingDao    bookingDao;

    // ── Available Actions ─────────────────────────────────────────────────────

    /**
     * Returns the list of actions the given actor may perform on this lead right now.
     * The frontend renders these as buttons — no status logic in React needed.
     */
    @Transactional(readOnly = true)
    public List<AvailableActionResponse> availableActions(Long leadId, Long instituteId,
                                                          UserPrincipal actor) {
        Lead lead = findOrThrow(leadId, instituteId);
        List<AvailableActionResponse> actions = new ArrayList<>();

        boolean isAdmin       = hasAuthority(actor, "LEAD_STATUS_OVERRIDE");
        boolean isCounsellor  = hasAuthority(actor, "COUNSELLOR_ASSIGN") && !isAdmin
                                && lead.getCounsellorId() != null
                                && lead.getCounsellorId().equals(actor.getId());

        // Derive effective stage — use stored stage but fall back to status-based inference
        // as a safety net for leads whose stage column wasn't backfilled correctly.
        LeadStage effectiveStage = lead.getStage();
        if (effectiveStage == null || effectiveStage == LeadStage.CALLER_PIPELINE) {
            // Re-derive from status in case the stored stage is stale
            LeadStage derived = LeadStage.fromStatus(lead.getStatus());
            if (derived != LeadStage.CALLER_PIPELINE) {
                effectiveStage = derived;  // trust the status over a stale CALLER_PIPELINE
            }
        }

        boolean isCallerPhase     = effectiveStage == LeadStage.CALLER_PIPELINE;
        boolean isCounsellorPhase = effectiveStage == LeadStage.COUNSELLOR_PIPELINE;
        boolean isTerminal        = effectiveStage == LeadStage.ADMITTED
                                    || effectiveStage == LeadStage.DEAD;

        if (isTerminal) {
            // Only admin override available on terminal leads
            if (isAdmin) {
                actions.add(override());
            }
            return actions;
        }

        // ── Caller phase actions ──────────────────────────────────────────────
        if (isCallerPhase && !isCounsellor) {
            LeadStatus s = lead.getStatus();

            // Check active booking — changes what actions are appropriate
            AdmissionBooking activeBooking = bookingDao
                .findActiveByLeadId(leadId, instituteId).orElse(null);
            boolean hasPaymentPending    = activeBooking != null
                && activeBooking.getBookingStatus() == BookingStatus.PAYMENT_PENDING;
            boolean hasBookingConfirmed  = activeBooking != null
                && activeBooking.getBookingStatus() == BookingStatus.BOOKING_CONFIRMED;
            boolean hasActiveBooking     = hasPaymentPending || hasBookingConfirmed;

            // ── Payment Pending state: proof uploaded / awaiting verification ──
            if (hasPaymentPending) {
                // Caller's only useful action is to follow up if student hasn't paid yet
                // "Not Connected" / call actions are irrelevant when there's a pending payment
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.MARK_CONTACTED.name())
                    .label("Called — Reached (Follow-up)")
                    .primary(true)
                    .group("Payment Follow-up")
                    .requiresInput(true)
                    .build());
                // Close group still available (student might withdraw)
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.MARK_NOT_INTERESTED.name())
                    .label("Student Withdrew")
                    .primary(false)
                    .group("Close")
                    .requiresInput(true)
                    .build());
                // Admin override if needed
                if (isAdmin) actions.add(override());
                return filterToAllowed(actions, lead.getStatus());
            }

            // ── Booking Confirmed (remote token, awaiting handoff) ─────────────
            if (hasBookingConfirmed) {
                // Lead paid, seat reserved — main action is handoff to counsellor
                // No call actions, no retry pool
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.MARK_NOT_INTERESTED.name())
                    .label("Student Withdrew After Booking")
                    .primary(false)
                    .group("Close")
                    .requiresInput(true)
                    .build());
                if (isAdmin) actions.add(override());
                return filterToAllowed(actions, lead.getStatus());
            }

            // ── Standard call actions (no active booking) ─────────────────────

            actions.add(AvailableActionResponse.builder()
                .action(LeadAction.MARK_CONTACTED.name())
                .label("Called — Reached")
                .primary(s == LeadStatus.ASSIGNED || s == LeadStatus.NEW_LEAD
                         || s == LeadStatus.CALLBACK || s == LeadStatus.FOLLOW_UP
                         || s == LeadStatus.NOT_CONNECTED)
                .group("Call")
                .requiresInput(true)
                .build());

            // Only show NOT_CONNECTED if not already in that state
            if (s != LeadStatus.NOT_CONNECTED) {
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.CALL_NOT_CONNECTED.name())
                    .label("Not Connected")
                    .primary(false)
                    .group("Call")
                    .requiresInput(false)
                    .build());
            }

            if (s == LeadStatus.CONTACTED || s == LeadStatus.INTERESTED
                    || s == LeadStatus.FOLLOW_UP || s == LeadStatus.CALLBACK) {

                if (s != LeadStatus.INTERESTED) {
                    actions.add(AvailableActionResponse.builder()
                        .action(LeadAction.MARK_INTERESTED.name())
                        .label("Mark Interested")
                        .primary(s == LeadStatus.CONTACTED)
                        .group("Call")
                        .requiresInput(false)
                        .build());
                }

                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.REQUEST_CALLBACK.name())
                    .label("Callback Requested")
                    .primary(false)
                    .group("Call")
                    .requiresInput(true)
                    .build());

                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.SCHEDULE_FOLLOW_UP.name())
                    .label("Schedule Follow-up")
                    .primary(false)
                    .group("Call")
                    .requiresInput(true)
                    .build());
            }

            // Plan Visit + Remote Admission: available from CONTACTED onwards
            if (s == LeadStatus.CONTACTED || s == LeadStatus.INTERESTED
                    || s == LeadStatus.FOLLOW_UP || s == LeadStatus.CALLBACK) {
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.PLAN_VISIT.name())
                    .label("Plan Visit")
                    .primary(s == LeadStatus.INTERESTED)
                    .group("Visit")
                    .requiresInput(true)
                    .build());

                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.CONFIRM_REMOTE_ADMISSION.name())
                    .label("Confirm Remote Admission")
                    .primary(false)
                    .group("Admission")
                    .requiresInput(false)
                    .build());
            }

            if (s == LeadStatus.VISIT_PLANNED) {
                // Primary action: student arrived — hand off to counsellor
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.STUDENT_VISITED.name())
                    .label("Student Visited — Hand Off to Counsellor")
                    .primary(true)
                    .group("Visit")
                    .requiresInput(true)   // needs counsellor selection + optional notes
                    .build());

                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.RESCHEDULE_VISIT.name())
                    .label("Reschedule Visit")
                    .primary(false)
                    .group("Visit")
                    .requiresInput(true)
                    .build());
            }

            actions.add(AvailableActionResponse.builder()
                .action(LeadAction.MARK_NOT_INTERESTED.name())
                .label("Not Interested")
                .primary(false)
                .group("Close")
                .requiresInput(true)
                .build());
        }

        // ── Counsellor phase actions ──────────────────────────────────────────
        if (isCounsellorPhase) {
            LeadStatus s = lead.getStatus();

            if (s == LeadStatus.VISIT_DONE || s == LeadStatus.VISIT_PLANNED
                    || s == LeadStatus.VISIT_PENDING) {
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.START_NEGOTIATION.name())
                    .label("Start Fee Discussion")
                    .primary(true)
                    .group("Counselling")
                    .requiresInput(false)
                    .build());

                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.SCHEDULE_POST_VISIT_FOLLOWUP.name())
                    .label("Schedule Follow-up")
                    .primary(false)
                    .group("Counselling")
                    .requiresInput(true)
                    .build());
            }

            if (s == LeadStatus.FOLLOW_UP_AFTER_VISIT) {
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.START_NEGOTIATION.name())
                    .label("Start Negotiation")
                    .primary(true)
                    .group("Counselling")
                    .requiresInput(false)
                    .build());

                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.SCHEDULE_POST_VISIT_FOLLOWUP.name())
                    .label("Schedule Another Follow-up")
                    .primary(false)
                    .group("Counselling")
                    .requiresInput(true)
                    .build());
            }

            if (s == LeadStatus.NEGOTIATION || s == LeadStatus.BOOKING_CONFIRMED) {
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.REQUEST_DOCUMENTS.name())
                    .label("Request Documents")
                    .primary(false)
                    .group("Admission")
                    .requiresInput(true)
                    .build());
            }

            if (s == LeadStatus.DOCUMENT_PENDING) {
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.MARK_DOCUMENTS_RECEIVED.name())
                    .label("Documents Received — Start Admission")
                    .primary(true)
                    .group("Admission")
                    .requiresInput(false)
                    .build());
            }

            if (s == LeadStatus.BOOKING_CONFIRMED || s == LeadStatus.ADMISSION_IN_PROGRESS) {
                // The frontend treats START_ADMISSION as "open the admission form" and
                // navigates to it — the lead advances to ADMISSION_IN_PROGRESS when the
                // admission record is actually created, not on this click.
                actions.add(AvailableActionResponse.builder()
                    .action(LeadAction.START_ADMISSION.name())
                    .label(s == LeadStatus.BOOKING_CONFIRMED ? "Start Admission Form" : "Continue Admission Form")
                    .primary(s == LeadStatus.BOOKING_CONFIRMED)
                    .group("Admission")
                    .requiresInput(false)
                    .build());
            }

            if (s == LeadStatus.ADMISSION_IN_PROGRESS) {
                boolean hasAdmission = admissionDao
                    .findAdmissionIdByLeadId(leadId, instituteId).isPresent();
                if (hasAdmission) {
                    actions.add(AvailableActionResponse.builder()
                        .action(LeadAction.COMPLETE_ADMISSION.name())
                        .label("Complete Admission ✓")
                        .primary(true)
                        .group("Admission")
                        .requiresInput(false)
                        .build());
                }
            }

            actions.add(AvailableActionResponse.builder()
                .action(LeadAction.MARK_NOT_INTERESTED.name())
                .label("Not Interested")
                .primary(false)
                .group("Close")
                .requiresInput(true)
                .build());
        }

        // Admin override always available (at the bottom)
        if (isAdmin) {
            actions.add(override());
        }

        return filterToAllowed(actions, lead.getStatus());
    }

    // ── Perform Action ────────────────────────────────────────────────────────

    /**
     * Validates and applies the requested action on the lead.
     * This is the single entry point for all workflow state transitions.
     */
    @Transactional
    public LeadResponse performAction(Long leadId, LeadActionRequest request,
                                      Long instituteId, UserPrincipal actor) {
        Lead lead = findOrThrow(leadId, instituteId);

        LeadAction action = parseAction(request.getAction());

        // Enforce valid state transitions centrally. Backward moves (e.g. a
        // VISIT_PLANNED lead being pulled back to CONTACTED) are rejected here —
        // they must go through ADMIN_STATUS_OVERRIDE, which is unrestricted and
        // requires a written, audited reason.
        if (!isTransitionAllowed(lead.getStatus(), action)) {
            throw new BusinessException(
                "\"" + action + "\" is not allowed while the lead is " + lead.getStatus()
                    + ". To change this manually, use an admin override.",
                "INVALID_WORKFLOW_TRANSITION", HttpStatus.CONFLICT);
        }

        // Route to the correct handler
        switch (action) {
            case MARK_CONTACTED            -> handleMarkContacted(lead, request, actor);
            case MARK_INTERESTED           -> handleMarkInterested(lead, request, actor);
            case REQUEST_CALLBACK          -> handleRequestCallback(lead, request, actor);
            case SCHEDULE_FOLLOW_UP        -> handleScheduleFollowUp(lead, request, actor);
            case PLAN_VISIT                -> handlePlanVisit(lead, request, actor);
            case RESCHEDULE_VISIT          -> handleRescheduleVisit(lead, request, actor);
            case CONFIRM_REMOTE_ADMISSION  -> handleConfirmRemoteAdmission(lead, request, actor);
            case CALL_NOT_CONNECTED        -> handleCallNotConnected(lead, request, actor);
            case MARK_NOT_INTERESTED       -> handleMarkNotInterested(lead, request, actor);
            case MARK_NOT_REACHABLE        -> handleMarkNotReachable(lead, request, actor);
            case STUDENT_VISITED           -> handleStudentVisited(lead, request, actor, instituteId);
            case CONFIRM_VISIT             -> handleConfirmVisit(lead, request, actor);
            case SCHEDULE_POST_VISIT_FOLLOWUP -> handlePostVisitFollowUp(lead, request, actor);
            case START_NEGOTIATION         -> handleStartNegotiation(lead, request, actor);
            case REQUEST_DOCUMENTS         -> handleRequestDocuments(lead, request, actor);
            case MARK_DOCUMENTS_RECEIVED   -> handleDocumentsReceived(lead, request, actor);
            case START_ADMISSION           -> handleStartAdmission(lead, request, actor);
            case COMPLETE_ADMISSION        -> handleCompleteAdmission(lead, request, actor, instituteId);
            case ADMIN_STATUS_OVERRIDE     -> handleAdminOverride(lead, request, actor);
            case REASSIGN_COUNSELLOR       -> handleReassignCounsellor(lead, request, actor, instituteId);
            default -> throw new BusinessException(
                "Action '" + action + "' is not yet implemented",
                "ACTION_NOT_IMPLEMENTED", HttpStatus.NOT_IMPLEMENTED);
        }

        // Always re-sync stage from status before saving (guards against stale stage data)
        if (lead.getStage() == null || lead.getStage() == LeadStage.CALLER_PIPELINE) {
            LeadStage correct = LeadStage.fromStatus(lead.getStatus());
            if (correct != LeadStage.CALLER_PIPELINE) lead.setStage(correct);
        }

        Lead saved = leadDao.save(lead);
        log.info("Lead {} action={} by actor={} → status={} stage={}",
            leadId, action, actor.getId(), saved.getStatus(), saved.getStage());
        return leadMapper.toResponse(saved);
    }

    // ── Action Handlers ───────────────────────────────────────────────────────

    private void handleMarkContacted(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCallerPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.CONTACTED);
        lead.setLastContactedAt(Instant.now());
        logAction(lead, LeadAction.MARK_CONTACTED, "CALL",
            req.getOutcome(), "Called — reached lead" + notes(req), actor.getId());
    }

    private void handleMarkInterested(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCallerPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.INTERESTED);
        lead.setLastContactedAt(Instant.now());
        logAction(lead, LeadAction.MARK_INTERESTED, "CALL",
            "INTERESTED", "Lead expressed interest" + notes(req), actor.getId());
    }

    private void handleRequestCallback(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCallerPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.CALLBACK);
        lead.setLastContactedAt(Instant.now());
        if (req.getFollowUpAt() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(req.getFollowUpAt()));
        }
        logAction(lead, LeadAction.REQUEST_CALLBACK, "CALL",
            "CALLBACK_REQUESTED", "Callback requested" + notes(req), actor.getId());
    }

    private void handleScheduleFollowUp(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.FOLLOW_UP);
        if (req.getFollowUpAt() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(req.getFollowUpAt()));
        }
        logAction(lead, LeadAction.SCHEDULE_FOLLOW_UP, "STATUS",
            null, "Follow-up scheduled" + notes(req), actor.getId());
    }

    private void handlePlanVisit(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCallerPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.VISIT_PLANNED);
        if (lead.getVisitPlannedAt() == null) {
            lead.setVisitPlannedAt(Instant.now());
        }
        if (req.getVisitDate() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(req.getVisitDate()));
        }
        logAction(lead, LeadAction.PLAN_VISIT, "STATUS",
            null, "Visit planned" + notes(req), actor.getId());
    }

    private void handleRescheduleVisit(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.VISIT_PLANNED);
        if (req.getVisitDate() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(req.getVisitDate()));
        }
        logAction(lead, LeadAction.RESCHEDULE_VISIT, "STATUS",
            null, "Visit rescheduled" + notes(req), actor.getId());
    }

    private void handleConfirmRemoteAdmission(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCallerPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.ADMISSION_INTERESTED);
        lead.setLastContactedAt(Instant.now());
        logAction(lead, LeadAction.CONFIRM_REMOTE_ADMISSION, "STATUS",
            null, "Remote admission confirmed" + notes(req), actor.getId());
    }

    private void handleCallNotConnected(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.NOT_CONNECTED);
        lead.setNotConnectedAt(Instant.now());
        logAction(lead, LeadAction.CALL_NOT_CONNECTED, "CALL",
            "NOT_CONNECTED",
            "Call not connected. Will enter retry pool in 30 minutes." + notes(req),
            actor.getId());
    }

    private void handleMarkNotInterested(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.NOT_INTERESTED);
        lead.setStage(LeadStage.DEAD);
        String reason = req.getReason() != null ? ". Reason: " + req.getReason() : "";
        logAction(lead, LeadAction.MARK_NOT_INTERESTED, "STATUS",
            "NOT_INTERESTED", "Lead marked not interested" + reason + notes(req), actor.getId());
    }

    private void handleMarkNotReachable(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireAdmin(actor);
        lead.setStatus(LeadStatus.NOT_REACHABLE);
        lead.setStage(LeadStage.DEAD);
        String reason = req.getReason() != null ? ". Reason: " + req.getReason() : "";
        logAction(lead, LeadAction.MARK_NOT_REACHABLE, "STATUS",
            "NOT_REACHABLE", "Lead marked not reachable — multiple attempts failed" + reason,
            actor.getId());
    }

    /**
     * Caller action: student physically visited the institute.
     * Marks the lead VISIT_DONE, transitions to COUNSELLOR_PIPELINE,
     * and hands off ownership to the selected counsellor — all in one step.
     */
    private void handleStudentVisited(Lead lead, LeadActionRequest req,
                                       UserPrincipal actor, Long instituteId) {
        requireCallerPhase(lead);
        requireOwnership(lead, actor);

        if (lead.getStatus() != LeadStatus.VISIT_PLANNED) {
            throw new BusinessException(
                "Lead must be in VISIT_PLANNED status for this action. Current: " + lead.getStatus(),
                "INVALID_WORKFLOW_STATE", HttpStatus.BAD_REQUEST);
        }
        if (req.getCounsellorId() == null) {
            throw new BusinessException(
                "counsellorId is required — please select which counsellor to hand off to.",
                "MISSING_COUNSELLOR_ID", HttpStatus.BAD_REQUEST);
        }

        Long previousOwnerId = lead.getAssignedToId();

        // Mutate the in-memory lead only — the single leadDao.save() at the end of
        // performAction() persists all of this with correct optimistic-lock handling.
        // (Previously this also did a direct leadDao.handoffToCounsellor() write, which
        //  bumped the row version and made the final save() fail with
        //  "modified by another user". save() maps every column we set below, so the
        //  one write is sufficient — same pattern as handleReassignCounsellor.)
        transferDao.record(LeadTransfer.builder()
            .leadId(lead.getId())
            .instituteId(instituteId)
            .transferType("COUNSELLOR_HANDOFF")
            .fromCallerId(previousOwnerId)
            .toCallerId(req.getCounsellorId())
            .notes(req.getNotes())
            .transferredBy(actor.getId())
            .build());

        lead.setStatus(LeadStatus.VISIT_DONE);
        lead.setStage(LeadStage.COUNSELLOR_PIPELINE);
        lead.setCounsellorId(req.getCounsellorId());
        lead.setAssignedToId(req.getCounsellorId());
        if (lead.getVisitDoneAt() == null) lead.setVisitDoneAt(Instant.now());
        lead.setHandedOffAt(Instant.now());

        activityService.recordStructured(
            lead.getId(), lead.getInstituteId(),
            LeadAction.STUDENT_VISITED.name(), "HANDOFF", "VISIT_DONE",
            "Student visited the institute. Lead handed off to counsellor ID "
                + req.getCounsellorId()
                + (req.getNotes() != null ? ". Notes: " + req.getNotes() : ""),
            actor.getId());
    }

    private void handleConfirmVisit(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.VISIT_DONE);
        lead.setStage(LeadStage.COUNSELLOR_PIPELINE);
        if (lead.getVisitDoneAt() == null) lead.setVisitDoneAt(Instant.now());
        logAction(lead, LeadAction.CONFIRM_VISIT, "STATUS",
            null, "Student visit confirmed" + notes(req), actor.getId());
    }

    private void handlePostVisitFollowUp(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.FOLLOW_UP_AFTER_VISIT);
        if (req.getFollowUpAt() != null) {
            lead.setNextFollowUpAt(DateTimeUtil.parseFlexible(req.getFollowUpAt()));
        }
        logAction(lead, LeadAction.SCHEDULE_POST_VISIT_FOLLOWUP, "STATUS",
            null, "Post-visit follow-up scheduled" + notes(req), actor.getId());
    }

    private void handleStartNegotiation(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.NEGOTIATION);
        logAction(lead, LeadAction.START_NEGOTIATION, "STATUS",
            null, "Fee negotiation started" + notes(req), actor.getId());
    }

    private void handleRequestDocuments(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);
        lead.setStatus(LeadStatus.DOCUMENT_PENDING);
        logAction(lead, LeadAction.REQUEST_DOCUMENTS, "STATUS",
            null, "Documents requested from student" + notes(req), actor.getId());
    }

    private void handleDocumentsReceived(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);
        if (lead.getStatus() != LeadStatus.DOCUMENT_PENDING) {
            throw new BusinessException(
                "Lead must be in DOCUMENT_PENDING status to mark documents received. Current: "
                    + lead.getStatus(), "INVALID_WORKFLOW_STATE", HttpStatus.BAD_REQUEST);
        }
        lead.setStatus(LeadStatus.ADMISSION_IN_PROGRESS);
        logAction(lead, LeadAction.MARK_DOCUMENTS_RECEIVED, "STATUS",
            null, "Documents received — admission started" + notes(req), actor.getId());
    }

    private void handleStartAdmission(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);
        if (lead.getStatus() != LeadStatus.BOOKING_CONFIRMED
                && lead.getStatus() != LeadStatus.DOCUMENT_PENDING) {
            throw new BusinessException(
                "Lead must be BOOKING_CONFIRMED or DOCUMENT_PENDING to start admission. Current: "
                    + lead.getStatus(), "INVALID_WORKFLOW_STATE", HttpStatus.BAD_REQUEST);
        }
        lead.setStatus(LeadStatus.ADMISSION_IN_PROGRESS);
        logAction(lead, LeadAction.START_ADMISSION, "STATUS",
            null, "Admission form started" + notes(req), actor.getId());
    }

    private void handleCompleteAdmission(Lead lead, LeadActionRequest req,
                                         UserPrincipal actor, Long instituteId) {
        requireCounsellorPhase(lead);
        requireOwnership(lead, actor);

        // Key Rule 5: ADMISSION_DONE requires a student record AND a batch assignment.
        // Checking the admission row exists is not enough — it can be created empty.
        Long admissionId = admissionDao
            .findAdmissionIdByLeadId(lead.getId(), instituteId).orElse(null);
        if (admissionId == null) {
            throw new BusinessException(
                "Cannot complete admission — no admission record found for this lead. " +
                "Please create the student record and batch assignment first.",
                "ADMISSION_RECORD_MISSING", HttpStatus.BAD_REQUEST);
        }
        Admission admission = admissionDao.findByIdAndInstituteId(admissionId, instituteId)
            .orElseThrow(() -> new BusinessException(
                "Cannot complete admission — admission record could not be loaded.",
                "ADMISSION_RECORD_MISSING", HttpStatus.BAD_REQUEST));
        if (admission.getStudentId() == null) {
            throw new BusinessException(
                "Cannot complete admission — no student record has been created yet. " +
                "Create the student record before completing admission.",
                "STUDENT_RECORD_MISSING", HttpStatus.BAD_REQUEST);
        }
        if (admission.getBatchId() == null) {
            throw new BusinessException(
                "Cannot complete admission — no batch has been assigned. " +
                "Assign a batch before completing admission.",
                "BATCH_NOT_ASSIGNED", HttpStatus.BAD_REQUEST);
        }

        lead.setStatus(LeadStatus.ADMISSION_DONE);
        lead.setStage(LeadStage.ADMITTED);
        if (lead.getAdmissionDoneAt() == null) lead.setAdmissionDoneAt(Instant.now());
        logAction(lead, LeadAction.COMPLETE_ADMISSION, "STATUS",
            "ADMISSION_DONE", "Admission completed — student enrolled" + notes(req), actor.getId());
    }

    private void handleAdminOverride(Lead lead, LeadActionRequest req, UserPrincipal actor) {
        requireAdmin(actor);
        if (req.getOverrideStatus() == null || req.getOverrideStatus().isBlank()) {
            throw new BusinessException(
                "overrideStatus is required for ADMIN_STATUS_OVERRIDE",
                "MISSING_OVERRIDE_STATUS", HttpStatus.BAD_REQUEST);
        }
        if (req.getReason() == null || req.getReason().isBlank()) {
            throw new BusinessException(
                "reason is required for ADMIN_STATUS_OVERRIDE — must explain why workflow is bypassed",
                "MISSING_OVERRIDE_REASON", HttpStatus.BAD_REQUEST);
        }
        LeadStatus previousStatus = lead.getStatus();
        LeadStatus newStatus = parseStatus(req.getOverrideStatus());
        lead.setStatus(newStatus);
        lead.setStage(deriveStage(newStatus));

        activityService.record(lead.getId(), lead.getInstituteId(),
            "ADMIN_STATUS_OVERRIDE",
            "Admin override: " + previousStatus + " → " + newStatus
                + ". Reason: " + req.getReason(),
            actor.getId());
    }

    private void handleReassignCounsellor(Lead lead, LeadActionRequest req,
                                          UserPrincipal actor, Long instituteId) {
        requireAdmin(actor);
        if (req.getCounsellorId() == null) {
            throw new BusinessException(
                "counsellorId is required for REASSIGN_COUNSELLOR",
                "MISSING_COUNSELLOR_ID", HttpStatus.BAD_REQUEST);
        }
        if (lead.getStage() != LeadStage.COUNSELLOR_PIPELINE) {
            throw new BusinessException(
                "Can only reassign counsellor on leads in COUNSELLOR_PIPELINE stage. Current: "
                    + lead.getStage(), "INVALID_WORKFLOW_STATE", HttpStatus.BAD_REQUEST);
        }
        Long previousCounsellor = lead.getCounsellorId();
        lead.setCounsellorId(req.getCounsellorId());
        lead.setAssignedToId(req.getCounsellorId());

        transferDao.record(LeadTransfer.builder()
            .leadId(lead.getId())
            .instituteId(instituteId)
            .transferType("COUNSELLOR_REASSIGNED")
            .fromCallerId(previousCounsellor)
            .toCallerId(req.getCounsellorId())
            .notes(req.getReason())
            .transferredBy(actor.getId())
            .build());

        activityService.record(lead.getId(), lead.getInstituteId(),
            "COUNSELLOR_REASSIGNED",
            "Counsellor reassigned from ID " + previousCounsellor
                + " to ID " + req.getCounsellorId()
                + (req.getReason() != null ? ". Reason: " + req.getReason() : ""),
            actor.getId());
    }

    // ── Stage derivation ──────────────────────────────────────────────────────

    /**
     * Derive the correct LeadStage from a LeadStatus.
     * Used when admin overrides the status directly.
     */
    public static LeadStage deriveStage(LeadStatus status) {
        return LeadStage.fromStatus(status);
    }

    // ── Precondition guards ───────────────────────────────────────────────────

    private void requireCallerPhase(Lead lead) {
        if (lead.getStage() != LeadStage.CALLER_PIPELINE) {
            throw new BusinessException(
                "This action is only available during the Caller phase. Current stage: "
                    + lead.getStage(), "WRONG_STAGE", HttpStatus.BAD_REQUEST);
        }
    }

    private void requireCounsellorPhase(Lead lead) {
        if (lead.getStage() != LeadStage.COUNSELLOR_PIPELINE) {
            throw new BusinessException(
                "This action is only available during the Counsellor phase. Current stage: "
                    + lead.getStage(), "WRONG_STAGE", HttpStatus.BAD_REQUEST);
        }
    }

    private void requireOwnership(Lead lead, UserPrincipal actor) {
        boolean isAdmin = hasAuthority(actor, "LEAD_STATUS_OVERRIDE");
        if (isAdmin) return;
        if (!java.util.Objects.equals(lead.getAssignedToId(), actor.getId())) {
            throw new BusinessException(
                "You can only perform actions on leads assigned to you",
                "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }

    private void requireAdmin(UserPrincipal actor) {
        if (!hasAuthority(actor, "LEAD_STATUS_OVERRIDE")) {
            throw new BusinessException(
                "This action requires admin privileges",
                "ACCESS_DENIED", HttpStatus.FORBIDDEN);
        }
    }

    private boolean hasAuthority(UserPrincipal actor, String authority) {
        return actor.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(authority));
    }

    // ── Activity logging ──────────────────────────────────────────────────────

    private void logAction(Lead lead, LeadAction action, String category,
                           String outcome, String description, Long actorId) {
        activityService.recordStructured(
            lead.getId(), lead.getInstituteId(),
            action.name(), category, outcome, description, actorId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Lead findOrThrow(Long id, Long instituteId) {
        return leadDao.findByIdAndInstituteId(id, instituteId)
            .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
    }

    private static LeadAction parseAction(String value) {
        try {
            return LeadAction.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid action '" + value + "'. Valid actions: "
                    + Arrays.toString(LeadAction.values()),
                "INVALID_LEAD_ACTION", HttpStatus.BAD_REQUEST);
        }
    }

    private static LeadStatus parseStatus(String value) {
        try {
            return LeadStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(
                "Invalid status '" + value + "'",
                "INVALID_LEAD_STATUS", HttpStatus.BAD_REQUEST);
        }
    }

    private static String notes(LeadActionRequest req) {
        return req.getNotes() != null && !req.getNotes().isBlank()
            ? ". Notes: " + req.getNotes() : "";
    }

    // ── Workflow transition rules (single source of truth) ────────────────────
    // These caller-pipeline statuses exist BEFORE a visit is planned.
    private static final Set<LeadStatus> PRE_VISIT_CALLER = EnumSet.of(
        LeadStatus.NEW_LEAD, LeadStatus.ASSIGNED, LeadStatus.CONTACTED,
        LeadStatus.INTERESTED, LeadStatus.FOLLOW_UP, LeadStatus.CALLBACK,
        LeadStatus.NOT_CONNECTED);

    // Actions whose source status is restricted. Any action NOT in this map is
    // unrestricted (Not Interested, Schedule Follow-up, admin override, and the
    // counsellor actions which already guard themselves by status). Both
    // availableActions() and performAction() consult this map, so the UI can
    // never offer a transition the API would reject.
    private static final Map<LeadAction, Set<LeadStatus>> ALLOWED_FROM = buildAllowedFrom();

    private static Map<LeadAction, Set<LeadStatus>> buildAllowedFrom() {
        Map<LeadAction, Set<LeadStatus>> m = new EnumMap<>(LeadAction.class);
        // Call-phase actions: valid only before a visit is planned. This is what
        // stops "Called — Reached" / "Not Connected" from regressing a
        // VISIT_PLANNED (or PAYMENT_PENDING) lead back into the call phase.
        m.put(LeadAction.MARK_CONTACTED,           PRE_VISIT_CALLER);
        m.put(LeadAction.CALL_NOT_CONNECTED,       PRE_VISIT_CALLER);
        m.put(LeadAction.MARK_INTERESTED,          PRE_VISIT_CALLER);
        m.put(LeadAction.REQUEST_CALLBACK,         PRE_VISIT_CALLER);
        m.put(LeadAction.PLAN_VISIT,               PRE_VISIT_CALLER);
        m.put(LeadAction.CONFIRM_REMOTE_ADMISSION, PRE_VISIT_CALLER);
        // Visit actions: valid only from a planned visit.
        m.put(LeadAction.RESCHEDULE_VISIT,         EnumSet.of(LeadStatus.VISIT_PLANNED));
        m.put(LeadAction.STUDENT_VISITED,          EnumSet.of(LeadStatus.VISIT_PLANNED));
        return m;
    }

    private static boolean isTransitionAllowed(LeadStatus from, LeadAction action) {
        Set<LeadStatus> allowed = ALLOWED_FROM.get(action);
        return allowed == null || allowed.contains(from);
    }

    /**
     * Drop any candidate actions the transition rules would reject, so the UI
     * never offers an action that performAction() would 409 on.
     */
    private static List<AvailableActionResponse> filterToAllowed(
            List<AvailableActionResponse> actions, LeadStatus from) {
        actions.removeIf(a -> {
            LeadAction act = tryParseAction(a.getAction());
            return act != null && !isTransitionAllowed(from, act);
        });
        return actions;
    }

    private static LeadAction tryParseAction(String value) {
        try {
            return value == null ? null : LeadAction.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static AvailableActionResponse override() {
        return AvailableActionResponse.builder()
            .action(LeadAction.ADMIN_STATUS_OVERRIDE.name())
            .label("Admin Override — Set Status Directly")
            .primary(false)
            .group("Admin")
            .requiresInput(true)
            .build();
    }
}
