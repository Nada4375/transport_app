from django.contrib import admin
from django import forms
from django.contrib.auth import get_user_model
from .models import Transporter

User = get_user_model()


class TransporterAdminForm(forms.ModelForm):
    class Meta:
        model = Transporter
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Afficher seulement les users avec rôle transporteur
        self.fields['user'].queryset = User.objects.filter(role='transporter')

        # En création : cacher les users qui ont déjà un profil transporteur
        if not self.instance.pk:
            used_users = Transporter.objects.values_list('user_id', flat=True)
            self.fields['user'].queryset = User.objects.filter(
                role='transporter'
            ).exclude(id__in=used_users)


@admin.register(Transporter)
class TransporterAdmin(admin.ModelAdmin):
    form = TransporterAdminForm

    list_display = (
        'company_name',
        'user',
        'city',
        'phone',
        'status',
        'is_available',
        'rating',
        'current_active_orders',
        'max_daily_orders',
    )

    list_filter = (
        'status',
        'is_available',
        'city',
    )

    search_fields = (
        'company_name',
        'user__username',
        'city',
        'phone',
        'email',
        'license_number',
    )

    readonly_fields = (
        'created_at',
        'rating',
        'total_deliveries',
    )

    fieldsets = (
        ('Compte utilisateur', {
            'fields': ('user',)
        }),

        ('Entreprise', {
            'fields': (
                'company_name',
                'responsable_name',
                'license_number',
            )
        }),

        ('Contact', {
            'fields': (
                'phone',
                'email',
            )
        }),

        ('Adresse', {
            'fields': (
                'city',
                'local_address',
                'latitude',
                'longitude',
            )
        }),

        ('Service', {
            'fields': (
                'service_radius_km',
                'is_available',
                'status',
            )
        }),

        ('Statistiques', {
            'fields': (
                'rating',
                'total_deliveries',
                'max_daily_orders',
                'current_active_orders',
            )
        }),
    )