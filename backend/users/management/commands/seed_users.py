from django.core.management.base import BaseCommand
from users.models import User

EMPLOYEES = [
    {"name":"Abinaya J","is_lead":True,"team":"3","cohort":1,"designation":"Database Administrator","emis_id":"4028657","email":"abinaya.j@tnschools.gov.in","role":"Database Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L3"},
    {"name":"Abishek J","is_lead":False,"team":"1","cohort":3,"designation":"Product Manager","emis_id":"4031663","email":"abishek.j@tnschools.gov.in","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028617","level":"L2"},
    {"name":"Abishek M","is_lead":False,"team":"4","cohort":2,"designation":"Quality Analyst","emis_id":"4033675","email":"abishek.m@tnschools.gov.in","role":"Test Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Antony Divine Raj","is_lead":False,"team":"1","cohort":3,"designation":"Product Manager","emis_id":"4028615","email":"antonydivineraj_l@tnscertasan.com","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028617","level":"L2"},
    {"name":"Arthi","is_lead":False,"team":"5","cohort":5,"designation":"Software Engineer","emis_id":"4028651","email":"arthi.s@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Ayyanar M","is_lead":False,"team":"3","cohort":5,"designation":"Mobile Hybrid Engineer","emis_id":"4028645","email":"ayyanar.m@tnschools.gov.in","role":"Senior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Balaji P","is_lead":False,"team":"5","cohort":3,"designation":"Sr. Quality Analyst","emis_id":"4028631","email":"balaji.p@tnschools.gov.in","role":"Test Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Chandra sekar","is_lead":True,"team":"7","cohort":10,"designation":"Data Analyst","emis_id":"4030520","email":"chandrasekar.a@tnschools.gov.in","role":"Data Analyst","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Dheepeshvaran M","is_lead":True,"team":"4","cohort":5,"designation":"Fullstack Engineer","emis_id":"4028649","email":"dheepesh.m@tnschools.gov.in","role":"Senior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Dinesh R","is_lead":False,"team":"5","cohort":5,"designation":"Associate Software Developer","emis_id":"4028641","email":"dinesh.r@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"G. Shalini","is_lead":False,"team":"8","cohort":9,"designation":"Project Associate","emis_id":"4001746","email":"shalini.g@tnschools.gov.in","role":"Regional Coordinator","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Gokul","is_lead":False,"team":"4","cohort":5,"designation":"Fullstack Engineer","emis_id":"4034562","email":"gokul.r@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Gunaseelan Peter S","is_lead":False,"team":"2","cohort":3,"designation":"Product Manager","emis_id":"4028619","email":"peter.s@tnschools.gov.in","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4030527","level":"L2"},
    {"name":"Gunasekar","is_lead":False,"team":"6","cohort":11,"designation":"DevOps Engineer","emis_id":"4034331","email":"gunasekar.s@tnschools.gov.in","role":"Devops Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"J. Jones Praveen","is_lead":False,"team":"2","cohort":3,"designation":"Product Manager","emis_id":"4030527","email":"jonespraveen.j@tnschools.gov.in","role":"PM Team Lead","perfiq":"MANAGER","is_manager":True,"is_master_admin":False,"reports_to_id":"4034137","level":"L1"},
    {"name":"Janani","is_lead":False,"team":"5","cohort":5,"designation":"Software Engineer","emis_id":"4028647","email":"jananimano@tnschools.gov.in","role":"Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Jeevitha M","is_lead":False,"team":"1","cohort":3,"designation":"Product Manager","emis_id":"4034385","email":"jeevithasheer@gmail.com","role":"Product Manager","perfiq":"MANAGER","is_manager":True,"is_master_admin":False,"reports_to_id":"4028617","level":"L2"},
    {"name":"JeyaMuragan","is_lead":False,"team":"4","cohort":1,"designation":"Database Administrator","emis_id":"4028659","email":"jeyamurugan.v@tnschools.gov.in","role":"Database Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Kamal T","is_lead":False,"team":"7","cohort":10,"designation":"Data Analyst","emis_id":"4030523","email":"kamal.t@tnschools.gov.in","role":"Data Analyst","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Karthik s","is_lead":False,"team":"5","cohort":1,"designation":"Database Administrator","emis_id":"4033154","email":"mail2karthick1810@gmail.com","role":"Database Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Kavin T","is_lead":False,"team":"5","cohort":5,"designation":"Associate Software Developer","emis_id":"4033677","email":"kavin.kt@tnschools.gov.in","role":"Junior Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Kolanchiyappa","is_lead":False,"team":"3","cohort":5,"designation":"App developer","emis_id":"4033753","email":"kolanchiyappa@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Logeshwari N","is_lead":False,"team":"8","cohort":9,"designation":"Process Associate","emis_id":"4033765","email":"logeshwari.n@tnschools.gov.in","role":"Regional Coordinator","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Manoj Kumar R","is_lead":False,"team":"3","cohort":13,"designation":"Sr. Project Manager","emis_id":"4033610","email":"manojkumar.r@tnschools.gov.in","role":"Senior Project Manager","perfiq":"MANAGER","is_manager":True,"is_master_admin":False,"reports_to_id":"4034137","level":"L1"},
    {"name":"Manoj P A","is_lead":False,"team":"6","cohort":5,"designation":"Fullstack Engineer","emis_id":"4028656","email":"manojprabhhu.pa@tnschools.gov.in","role":"Senior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Mary Jerine G","is_lead":True,"team":"8","cohort":9,"designation":"Product Manager","emis_id":"4001727","email":"maryjerine.g@tnschools.gov.in","role":"Regional Coordinator","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Maxwell","is_lead":False,"team":"1","cohort":3,"designation":"Product Manager","emis_id":"4033792","email":"maxwell.dj@tnschools.gov.in","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028617","level":"L2"},
    {"name":"Mathanagopal R","is_lead":True,"team":"6","cohort":11,"designation":"Sr. DevOps Engineer","emis_id":"4034037","email":"mathanagopal.r@tnschools.gov.in","role":"Devops Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Mohana krishnan","is_lead":False,"team":"4","cohort":13,"designation":"Sr. Project Manager","emis_id":"4028605","email":"mohanakrishnan.s@tnschools.gov.in","role":"Project Manager","perfiq":"MANAGER","is_manager":True,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Mohanapriya k","is_lead":False,"team":"4","cohort":3,"designation":"Quality Analyst","emis_id":"4034568","email":"mohanapriyamat@tnschools.gov.in","role":"Test Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Mohanraj M","is_lead":False,"team":"4","cohort":1,"designation":"Database Administrator","emis_id":"4028658","email":"mohanraj.m@tnschools.gov.in","role":"Database Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Narender Naidu","is_lead":False,"team":"4","cohort":5,"designation":"Junior Software Developer","emis_id":"4034565","email":"narendernaidu.k@tnschools.gov.in","role":"Senior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"NirmalKumar M","is_lead":False,"team":"6","cohort":11,"designation":"DevOps Engineer","emis_id":"4028625","email":"nirmalkumar.m@tnschools.gov.in","role":"Devops Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Prabath K","is_lead":False,"team":"3","cohort":2,"designation":"Junior Software Developer","emis_id":"4034463","email":"prabathk.k@tnschools.gov.in","role":"Junior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Roshan Lal","is_lead":False,"team":"2","cohort":3,"designation":"Project Associate","emis_id":"4034388","email":"roshanlal.b.s@tnschools.gov.in","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4030527","level":"L2"},
    {"name":"Santhoshini -S","is_lead":False,"team":"3","cohort":5,"designation":"Junior Software Developer","emis_id":"4034462","email":"santhoshini_s@tnschools.gov.in","role":"Junior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Saranraj S","is_lead":False,"team":"4","cohort":5,"designation":"Mobile Developer","emis_id":"4034564","email":"saranraj.s@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Saraswathi B","is_lead":False,"team":"2","cohort":3,"designation":"Product Manager","emis_id":"4028609","email":"Saraswathi@tnschools.gov.in","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4030527","level":"L2"},
    {"name":"Selva kumar B","is_lead":False,"team":"4","cohort":6,"designation":"Fullstack Engineer","emis_id":"4028653","email":"selvakumar.b@tnschools.gov.in","role":"BackEnd Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Sreethanya","is_lead":False,"team":"4","cohort":5,"designation":"Associate Software Developer","emis_id":"4033678","email":"sreethanya.v@tnschools.gov.in","role":"Junior Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Subash R","is_lead":False,"team":"8","cohort":9,"designation":"Jr. Network Engineer","emis_id":"4033690","email":"subash.r@tnschools.gov.in","role":"Regional Coordinator","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Subash Pandian M","is_lead":False,"team":"7","cohort":1,"designation":"Database Developer","emis_id":"4031277","email":"subashpandian.m@tnschools.gov.in","role":"Database Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Subash Sharan M","is_lead":False,"team":"3","cohort":5,"designation":"Fullstack Developer","emis_id":"4034464","email":"subashsharan.m@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L3"},
    {"name":"Sudhakar T V","is_lead":False,"team":"9","cohort":7,"designation":"Network Engineer","emis_id":"4033490","email":"sudhahar.tv@tnschools.gov.in","role":"Hardware & Network Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    {"name":"Suhasini S","is_lead":False,"team":"2","cohort":3,"designation":"Product Manager","emis_id":"4033691","email":"suhasini.s@tnschools.gov.in","role":"Product Manager","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4030527","level":"L2"},
    {"name":"Sundar","is_lead":False,"team":"3","cohort":5,"designation":"Mobile Developer","emis_id":"4034466","email":"sundar.p@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Thilak Ram","is_lead":False,"team":"4","cohort":5,"designation":"Associate Software Developer","emis_id":"4033347","email":"thilak.r@tnschools.gov.on","role":"Associate Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028605","level":"L3"},
    {"name":"Thirunavukkarasu B","is_lead":False,"team":"1","cohort":12,"designation":"Designer","emis_id":"4034560","email":"thirunavukkarasu.b@tnschools.gov.in","role":"UI/UX Designer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028617","level":"L2"},
    {"name":"Vaishali Baskar","is_lead":False,"team":"3","cohort":5,"designation":"Fullstack Developer","emis_id":"4034465","email":"vaishalinaidu286@gmail.com","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Vaseekaran","is_lead":False,"team":"6","cohort":13,"designation":"Sr. Architect Manager","emis_id":"4028606","email":"vaseekaran.r@tnschools.gov.in","role":"Architect Manager","perfiq":"MANAGER","is_manager":True,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Vijaya Kumar S","is_lead":False,"team":"5","cohort":6,"designation":"API Developer","emis_id":"4028652","email":"vijayakumar.s@tnschools.gov.in","role":"BackEnd Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Vinothini J","is_lead":False,"team":"5","cohort":5,"designation":"Fullstack Engineer","emis_id":"4028644","email":"vinothini.j@tnschools.gov.in","role":"Senior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Yasar Arafath J","is_lead":False,"team":"1","cohort":3,"designation":"Product Manager","emis_id":"4028617","email":"yasar_arafath@tnschools.gov.in","role":"PM Team Lead","perfiq":"MANAGER","is_manager":True,"is_master_admin":False,"reports_to_id":"4034137","level":"L1"},
    {"name":"Yuvanesh B","is_lead":False,"team":"3","cohort":3,"designation":"Quality Analyst","emis_id":"4033676","email":"yuvanesh.r@tnschools.gov.in","role":"Test Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Bhoomija S V","is_lead":False,"team":"10","cohort":8,"designation":"Human Resources","emis_id":"4034561","email":"bhoomija.s@tnschools.gov.in","role":"Human Resources","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4034385","level":"L3"},
    {"name":"Aadhithya K","is_lead":False,"team":"3","cohort":5,"designation":"Junior Software Engineer","emis_id":"4034563","email":"aadhithya.k@tnschools.gov.in","role":"Junior Software Engineer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Sneha K","is_lead":False,"team":"3","cohort":5,"designation":"FullStack Engineer","emis_id":"4034567","email":"sneha.k@tnschools.gov.in","role":"Full Stack Developer","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4033610","level":"L2"},
    {"name":"Kandhan S","is_lead":False,"team":"7","cohort":10,"designation":"Data Entry Associate","emis_id":"4034566","email":"kandhan.s@tnschools.gov.in","role":"Data Analyst","perfiq":"EMPLOYEE","is_manager":False,"is_master_admin":False,"reports_to_id":"4028606","level":"L3"},
    # CTO - no reports_to
    {"name":"Varun","is_lead":False,"team":"1","cohort":13,"designation":"CTO","emis_id":"4034137","email":"varun.m@tnschools.gov.in","role":"CTO","perfiq":"CTO","is_manager":True,"is_master_admin":True,"reports_to_id":None,"level":"L0"},
]

PASSWORDS = {
    "varun.m@tnschools.gov.in": "cto123",
}
DEFAULT_PASSWORD = "pass123"


class Command(BaseCommand):
    help = 'Seed all 57 EMIS employees into the database'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding users (pass 1 — no foreign keys)...')

        # Pass 1: create all users without reports_to
        for emp in EMPLOYEES:
            email = emp['email'].lower()
            if User.objects.filter(emis_id=emp['emis_id']).exists():
                self.stdout.write(f'  skip {emp["name"]} (exists)')
                continue
            password = PASSWORDS.get(email, DEFAULT_PASSWORD)
            user = User(
                email=email,
                name=emp['name'],
                emis_id=emp['emis_id'],
                perfiq=emp['perfiq'],
                role=emp['role'],
                designation=emp['designation'],
                level=emp['level'],
                team=emp['team'],
                cohort=emp['cohort'],
                is_manager=emp['is_manager'],
                is_master_admin=emp['is_master_admin'],
                is_lead=emp['is_lead'],
                is_staff=emp['is_master_admin'],
            )
            user.set_password(password)
            user.save()
            self.stdout.write(f'  created {emp["name"]}')

        self.stdout.write('Seeding users (pass 2 — setting reports_to)...')

        # Pass 2: link reports_to
        for emp in EMPLOYEES:
            if not emp['reports_to_id']:
                continue
            try:
                user = User.objects.get(emis_id=emp['emis_id'])
                manager = User.objects.get(emis_id=emp['reports_to_id'])
                user.reports_to = manager
                user.save(update_fields=['reports_to'])
            except User.DoesNotExist:
                self.stdout.write(f'  warning: could not link {emp["name"]}')

        total = User.objects.count()
        self.stdout.write(self.style.SUCCESS(f'Done! {total} users in database.'))
