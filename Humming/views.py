"""
Views for Humming project.
"""

from django.shortcuts import render


def index(request):
    """
    Render the main HumSearch page.
    """
    return render(request, 'index.html')