package com.jobreview.moderation;

import com.jobreview.appeal.AppealRepository;
import com.jobreview.appeal.AppealStatus;
import com.jobreview.company.CompanyRepository;
import com.jobreview.company.CompanyStatus;
import com.jobreview.complaint.Complaint;
import com.jobreview.complaint.ComplaintRepository;
import com.jobreview.employee.DisciplinaryRecord;
import com.jobreview.employee.DisciplinaryRecordRepository;
import com.jobreview.profile.ProfileChangeRequest;
import com.jobreview.profile.ProfileChangeRequestRepository;
import com.jobreview.review.ReviewRepository;
import com.jobreview.support.SupportTicket;
import com.jobreview.support.SupportTicketRepository;
import com.jobreview.user.UserRepository;
import java.time.LocalDateTime;
import java.util.EnumSet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Счётчики всех очередей модерации — для вкладки «Мониторинг» и бейджей на вкладках.
 */
@Service
public class ModerationSummaryService {

    private final CompanyRepository companyRepository;
    private final ProfileChangeRequestRepository profileChangeRepository;
    private final UserRepository userRepository;
    private final DisciplinaryRecordRepository disciplineRepository;
    private final ComplaintRepository complaintRepository;
    private final AppealRepository appealRepository;
    private final SupportTicketRepository ticketRepository;
    private final ReviewRepository reviewRepository;

    public ModerationSummaryService(CompanyRepository companyRepository,
                                    ProfileChangeRequestRepository profileChangeRepository,
                                    UserRepository userRepository, DisciplinaryRecordRepository disciplineRepository,
                                    ComplaintRepository complaintRepository, AppealRepository appealRepository,
                                    SupportTicketRepository ticketRepository, ReviewRepository reviewRepository) {
        this.companyRepository = companyRepository;
        this.profileChangeRepository = profileChangeRepository;
        this.userRepository = userRepository;
        this.disciplineRepository = disciplineRepository;
        this.complaintRepository = complaintRepository;
        this.appealRepository = appealRepository;
        this.ticketRepository = ticketRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional(readOnly = true)
    public Summary summary() {
        return new Summary(
                companyRepository.countByStatus(CompanyStatus.PENDING),
                profileChangeRepository.countByStatus(ProfileChangeRequest.Status.PENDING),
                userRepository.findPendingRepresentatives().size(),
                disciplineRepository.countByStatus(DisciplinaryRecord.Status.PENDING),
                complaintRepository.countByStatus(Complaint.Status.OPEN),
                appealRepository.countByStatus(AppealStatus.PENDING),
                ticketRepository.countByStatusIn(EnumSet.of(SupportTicket.Status.NEW, SupportTicket.Status.IN_PROGRESS)),
                reviewRepository.countByCreatedAtAfter(LocalDateTime.now().minusHours(24)),
                userRepository.countByBlockedTrue());
    }

    public record Summary(long pendingCompanies, long pendingProfileChanges, long pendingRepresentatives,
                          long pendingDiscipline, long openComplaints, long pendingAppeals, long openTickets,
                          long reviewsLast24h, long blockedUsers) {
    }
}
