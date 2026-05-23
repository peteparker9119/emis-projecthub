from django.core.management.base import BaseCommand
from projects.models import Team
from users.models import User

TEAMS = [
    {'name':'Core Blasters','department':'Dev','tl':'vinothini.j@tnschools.gov.in','members':['arthi.s@tnschools.gov.in','kavin.kt@tnschools.gov.in','balaji.p@tnschools.gov.in','jananimano@tnschools.gov.in','vijayakumar.s@tnschools.gov.in','mail2karthick1810@gmail.com']},
    {'name':'Debuggers','department':'Dev','tl':'abinaya.j@tnschools.gov.in','members':['ayyanar.m@tnschools.gov.in','subashsharan.m@tnschools.gov.in','kolanchiyappa@tnschools.gov.in','prabathk.k@tnschools.gov.in','sundar.p@tnschools.gov.in','yuvanesh.r@tnschools.gov.in','sneha.k@tnschools.gov.in']},
    {'name':'Tech Sparks','department':'Dev','tl':'dheepesh.m@tnschools.gov.in','members':['abishek.m@tnschools.gov.in','mohanapriyamat@tnschools.gov.in','saranraj.s@tnschools.gov.in','thilak.r@tnschools.gov.on','selvakumar.b@tnschools.gov.in','gokul.r@tnschools.gov.in','sreethanya.v@tnschools.gov.in','mohanraj.m@tnschools.gov.in','dinesh.r@tnschools.gov.in']},
    {'name':'Tech Titans','department':'Dev','tl':'manojprabhhu.pa@tnschools.gov.in','members':['vaishalinaidu286@gmail.com','santhoshini_s@tnschools.gov.in','narendernaidu.k@tnschools.gov.in','aadhithya.k@tnschools.gov.in']},
    {'name':'Rangers','department':'PM','tl':'yasar_arafath@tnschools.gov.in','members':['abishek.j@tnschools.gov.in','antonydivineraj_l@tnscertasan.com','jeevithasheer@gmail.com','maxwell.dj@tnschools.gov.in']},
    {'name':'Mavericks','department':'PM','tl':'jonespraveen.j@tnschools.gov.in','members':['peter.s@tnschools.gov.in','saraswathi@tnschools.gov.in','suhasini.s@tnschools.gov.in','roshanlal.b.s@tnschools.gov.in']},
    {'name':'DevOps','department':'DevOps','tl':'mathanagopal.r@tnschools.gov.in','members':['gunasekar.s@tnschools.gov.in','manojprabhhu.pa@tnschools.gov.in','nirmalkumar.m@tnschools.gov.in']},
    {'name':'Data Squad','department':'Data','tl':'chandrasekar.a@tnschools.gov.in','members':['kamal.t@tnschools.gov.in','kandhan.s@tnschools.gov.in']},
    {'name':'Coordinators','department':'Regional','tl':'maryjerine.g@tnschools.gov.in','members':['logeshwari.n@tnschools.gov.in','shalini.g@tnschools.gov.in','subash.r@tnschools.gov.in']},
]

class Command(BaseCommand):
    help = 'Seed team structure'
    def handle(self, *args, **kwargs):
        for t in TEAMS:
            try: tl = User.objects.get(email=t['tl'])
            except User.DoesNotExist: tl = None; self.stdout.write(f"TL not found: {t['tl']}")
            team, created = Team.objects.get_or_create(name=t['name'], defaults={'department':t['department'],'team_lead':tl})
            if not created:
                team.department = t['department']; team.team_lead = tl; team.save()
            team.members.clear()
            for email in t['members']:
                try: team.members.add(User.objects.get(email=email))
                except User.DoesNotExist: self.stdout.write(f"  Not found: {email}")
            self.stdout.write(f"{'Created' if created else 'Updated'}: {team.name} ({team.members.count()} members, TL={tl})")
