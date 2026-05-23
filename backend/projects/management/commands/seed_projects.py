from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import User
from projects.models import Sprint, Task, Requirement, Bug, Idea, Activity


def get_user(email):
    try:
        return User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return None


class Command(BaseCommand):
    help = 'Seed initial project data: sprints, tasks, requirements, bugs, ideas, activity'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding projects data...'))

        # ------------------------------------------------------------------ #
        # Sprints                                                              #
        # ------------------------------------------------------------------ #
        Sprint.objects.all().delete()

        sp1 = Sprint(
            id='SP-001',
            name='Sprint 11',
            start_date='2025-05-01',
            end_date='2025-05-14',
            goal='Complete M2 milestone for SMC Portal',
            capacity=42,
            velocity=38,
            status='Completed',
        )
        sp1.save()

        sp2 = Sprint(
            id='SP-002',
            name='Sprint 12',
            start_date='2025-05-15',
            end_date='2025-05-28',
            goal='Deploy ScrumOS v3, integrate Jira sync',
            capacity=45,
            velocity=31,
            status='Active',
        )
        sp2.save()

        sp3 = Sprint(
            id='SP-003',
            name='Sprint 13',
            start_date='2025-06-02',
            end_date='2025-06-15',
            goal='Launch RBAC system and audit log',
            capacity=40,
            velocity=0,
            status='Planning',
        )
        sp3.save()

        self.stdout.write(self.style.SUCCESS('  [OK] 3 sprints created'))

        # ------------------------------------------------------------------ #
        # Tasks                                                                #
        # ------------------------------------------------------------------ #
        Task.objects.all().delete()

        tasks_data = [
            ('TSK-001', 'Implement gate-check logic for M3 staging', 'Critical', 'In Progress',
             'abinaya.j@tnschools.gov.in', 'SP-002'),
            ('TSK-002', 'Build Kanban board for TeamFlow', 'High', 'Done',
             'dheepesh.m@tnschools.gov.in', 'SP-002'),
            ('TSK-003', 'Integrate TL Sheet import API', 'High', 'To Do',
             'gokul.r@tnschools.gov.in', 'SP-002'),
            ('TSK-004', 'Design RBAC permission engine', 'Critical', 'In Progress',
             'mohanakrishnan.s@tnschools.gov.in', 'SP-002'),
            ('TSK-005', 'Standup IPL theme animations', 'Low', 'Done',
             'thirunavukkarasu.b@tnschools.gov.in', 'SP-001'),
        ]

        for tid, title, priority, tstatus, email, sprint_id in tasks_data:
            assignee = get_user(email)
            sprint = Sprint.objects.get(pk=sprint_id)
            t = Task(
                id=tid,
                title=title,
                priority=priority,
                status=tstatus,
                assignee=assignee,
                sprint=sprint,
            )
            t.save()
            if assignee is None:
                self.stdout.write(self.style.WARNING(
                    f'    WARNING: User not found for email {email} (task {tid})'
                ))

        self.stdout.write(self.style.SUCCESS('  [OK] 5 tasks created'))

        # ------------------------------------------------------------------ #
        # Requirements                                                         #
        # ------------------------------------------------------------------ #
        Requirement.objects.all().delete()

        reqs_data = [
            ('REQ-001', 'Sprint dashboard with real-time sprint data', 'Critical', 'Done',
             'yasar_arafath@tnschools.gov.in', 'SP-001'),
            ('REQ-002', 'Gate-check validation engine', 'High', 'In Progress',
             'jonespraveen.j@tnschools.gov.in', 'SP-002'),
            ('REQ-003', 'AI Copilot integration for sprint suggestions', 'Medium', 'Open',
             'manojkumar.r@tnschools.gov.in', 'SP-003'),
            ('REQ-004', 'UDISE-based school search filter', 'High', 'Review',
             'Saraswathi@tnschools.gov.in', 'SP-002'),
        ]

        for rid, title, priority, rstatus, email, sprint_id in reqs_data:
            assignee = get_user(email)
            sprint = Sprint.objects.get(pk=sprint_id)
            r = Requirement(
                id=rid,
                title=title,
                priority=priority,
                status=rstatus,
                assignee=assignee,
                sprint=sprint,
            )
            r.save()
            if assignee is None:
                self.stdout.write(self.style.WARNING(
                    f'    WARNING: User not found for email {email} (req {rid})'
                ))

        self.stdout.write(self.style.SUCCESS('  [OK] 4 requirements created'))

        # ------------------------------------------------------------------ #
        # Bugs                                                                 #
        # ------------------------------------------------------------------ #
        Bug.objects.all().delete()

        bugs_data = [
            ('BUG-001', 'Duplicate Zoho item IDs appearing in sprint board', 'Critical', 'In Progress',
             'abinaya.j@tnschools.gov.in', 'SP-002', 'Data'),
            ('BUG-002', 'M3 staging sign-off not saving correctly', 'High', 'Open',
             'dheepesh.m@tnschools.gov.in', 'SP-002', 'UI'),
            ('BUG-003', 'Gate-check blocking valid approved items', 'High', 'Fixed',
             'mohanakrishnan.s@tnschools.gov.in', 'SP-001', 'API'),
            ('BUG-004', 'IPL standup timer not resetting after ball 3', 'Low', 'Closed',
             'thirunavukkarasu.b@tnschools.gov.in', 'SP-001', 'UI'),
        ]

        for bid, title, priority, bstatus, email, sprint_id, bug_type in bugs_data:
            assignee = get_user(email)
            sprint = Sprint.objects.get(pk=sprint_id)
            b = Bug(
                id=bid,
                title=title,
                priority=priority,
                status=bstatus,
                assignee=assignee,
                sprint=sprint,
                bug_type=bug_type,
            )
            b.save()
            if assignee is None:
                self.stdout.write(self.style.WARNING(
                    f'    WARNING: User not found for email {email} (bug {bid})'
                ))

        self.stdout.write(self.style.SUCCESS('  [OK] 4 bugs created'))

        # ------------------------------------------------------------------ #
        # Ideas                                                                #
        # ------------------------------------------------------------------ #
        Idea.objects.all().delete()

        ideas_data = [
            ('IDEA-001', 'AI-powered sprint planning suggestions', 8, 'Under Review',
             'yasar_arafath@tnschools.gov.in'),
            ('IDEA-002', 'WhatsApp integration for standup reminders', 12, 'Approved',
             'jonespraveen.j@tnschools.gov.in'),
            ('IDEA-003', 'Dark mode for EMIS ProjectHub', 5, 'Open',
             'thirunavukkarasu.b@tnschools.gov.in'),
            ('IDEA-004', 'Confluence-style wiki for project docs', 15, 'Approved',
             'manojkumar.r@tnschools.gov.in'),
            ('IDEA-005', 'Burndown chart auto-export to PDF', 6, 'Open',
             'Saraswathi@tnschools.gov.in'),
        ]

        for iid, title, votes, istatus, email in ideas_data:
            submitted_by = get_user(email)
            i = Idea(
                id=iid,
                title=title,
                votes=votes,
                status=istatus,
                submitted_by=submitted_by,
            )
            i.save()
            if submitted_by is None:
                self.stdout.write(self.style.WARNING(
                    f'    WARNING: User not found for email {email} (idea {iid})'
                ))

        self.stdout.write(self.style.SUCCESS('  [OK] 5 ideas created'))

        # ------------------------------------------------------------------ #
        # Activity                                                             #
        # ------------------------------------------------------------------ #
        Activity.objects.all().delete()

        activity_data = [
            ('Abinaya J updated BUG-001 status to In Progress', '\U0001f41b'),
            ('Dheepeshvaran M completed TSK-002', '\u2705'),
            ('Yasar Arafath J created Sprint 13', '\U0001f3c3'),
            ('J. Jones Praveen approved IDEA-002', '\U0001f4a1'),
            ('Manoj Kumar R updated REQ-003 priority to Medium', '\U0001f4cb'),
        ]

        # Insert newest-first means we insert in reverse order so auto timestamps work,
        # but since auto_now_add uses DB time we just insert them in listed order.
        for text, icon in activity_data:
            Activity.objects.create(text=text, icon=icon)

        self.stdout.write(self.style.SUCCESS('  [OK] 5 activity entries created'))

        self.stdout.write(self.style.SUCCESS('\nSeed completed successfully!'))
