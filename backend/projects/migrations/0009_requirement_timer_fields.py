from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0008_add_meetings_and_scrum_alerts'),
    ]

    operations = [
        migrations.AddField(
            model_name='requirement',
            name='item_type',
            field=models.CharField(
                choices=[
                    ('REQ',    'Requirement'),
                    ('Bug',    'Bug'),
                    ('Task',   'Task'),
                    ('QA',     'QA'),
                    ('Report', 'Report'),
                    ('TI',     'Tech Initiative'),
                    ('Spike',  'Spike'),
                    ('Adhoc',  'Adhoc'),
                ],
                default='REQ',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='requirement',
            name='start_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='requirement',
            name='end_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='requirement',
            name='story_points',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='requirement',
            name='breach_notified',
            field=models.BooleanField(default=False),
        ),
    ]
