"""Builds the three fictional demo resumes as text-based PDFs. Run: python demo/make_resumes.py"""
import textwrap
from pathlib import Path

import pymupdf

OUT = Path(__file__).parent / "resumes"
INK = (0.1, 0.1, 0.1)
MUTED = (0.35, 0.35, 0.35)
LEFT, TOP, BOTTOM = 56, 60, 790
WRAP = 92

RESUMES = {
    "hira-malik-strong.pdf": {
        "name": "Hira Malik",
        "contact": "hira.malik@example.com  |  +92 300 555 0101  |  Lahore",
        "sections": [
            ("Summary", ["Backend engineer with four years of experience building Python web services and the data layers behind them."]),
            ("Skills", ["Python, Django, Django REST Framework, PostgreSQL, Docker, Redis, Celery, pytest, GitHub Actions"]),
            ("Experience", [
                "*Backend Engineer, Northwind Logistics (fictional), 2021 - 2025",
                "- Built a shipment tracking API in Django and Django REST Framework serving 2 million requests a day.",
                "- Designed PostgreSQL schemas and indexes, cutting the slowest report query from 9 seconds to under 1 second.",
                "- Packaged every service in Docker and wrote the Compose setup the whole team uses for local development.",
                "- Moved background jobs to Celery and Redis, and added pytest coverage for the billing flows.",
                "*Junior Python Developer, Bluegrid Software (fictional), 2020 - 2021",
                "- Maintained internal Django admin tools and wrote Python scripts for data imports.",
            ]),
            ("Projects", [
                "*Clinic Booking API",
                "- A Django REST API with a PostgreSQL database for appointment booking, deployed with Docker Compose.",
                "*Warehouse Stock Alerts",
                "- A Python and Celery service that watches stock levels in PostgreSQL and sends low-stock alerts.",
            ]),
            ("Education", ["BS Computer Science, City Technical University (fictional), 2020"]),
        ],
    },
    "omar-tariq-semantic.pdf": {
        "name": "Omar Tariq",
        "contact": "omar.tariq@example.com  |  +92 321 555 0102  |  Islamabad",
        "sections": [
            ("Profile", ["Server-side developer who enjoys reliable systems, clean APIs and tidy database design."]),
            ("Skills", ["Flask, FastAPI, SQLAlchemy, Postgres, Kubernetes, pytest, Celery, REST API design"]),
            ("Experience", [
                "*Software Developer, Finlay Payments (fictional), 2022 - 2025",
                "- Wrote payment microservices with Flask and FastAPI, tested with pytest.",
                "- Tuned slow Postgres queries, wrote PL/pgSQL functions and managed schema migrations with Alembic.",
                "- Containerised every service, built the container images in CI and shipped them to a Kubernetes cluster.",
                "*Associate Developer, Harbour Data (fictional), 2021 - 2022",
                "- Built internal reporting endpoints with SQLAlchemy models on top of a relational database.",
            ]),
            ("Projects", [
                "*Invoice Tracker",
                "- A Flask REST service backed by Postgres, running as containerised services behind an Nginx proxy.",
            ]),
            ("Education", ["BS Software Engineering, Capital Institute of Computing (fictional), 2021"]),
        ],
    },
    "zara-noor-weak.pdf": {
        "name": "Zara Noor",
        "contact": "zara.noor@example.com  |  +92 333 555 0103  |  Karachi",
        "sections": [
            ("Summary", [
                "Frontend developer focused on accessible interfaces, now moving towards backend work. "
                "I have no hands-on Docker experience yet.",
            ]),
            ("Skills", ["React, TypeScript, CSS, Figma, Jest, basic Python, MySQL"]),
            ("Experience", [
                "*Frontend Developer, Brightly Studio (fictional), 2023 - 2025",
                "- Built a React component library used across six products.",
                "- Improved keyboard navigation and screen reader support across the main dashboard.",
                "- Wrote small Python scripts to clean up exported analytics data.",
            ]),
            ("Projects", [
                "*Recipe Finder",
                "- A React and TypeScript single-page app that reads from a small MySQL-backed API built by a teammate.",
            ]),
            ("Education", ["BS Computer Science, Coastal College of Technology (fictional), 2023"]),
        ],
    },
}


def build(filename, resume):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    y = TOP

    def write(text, size=10, font="helv", color=INK, indent=0, gap=14):
        nonlocal y
        page.insert_text((LEFT + indent, y), text, fontsize=size, fontname=font, color=color)
        y += gap

    write(resume["name"], size=18, font="hebo", gap=18)
    write(resume["contact"], color=MUTED, gap=24)
    for title, lines in resume["sections"]:
        write(title, size=12, font="hebo", gap=15)
        for line in lines:
            if line.startswith("*"):
                write(line[1:], font="hebo")
                continue
            bullet = line.startswith("- ")
            body = line[2:] if bullet else line
            for i, part in enumerate(textwrap.wrap(body, WRAP)):
                write(f"- {part}" if bullet and i == 0 else part, indent=8 if bullet and i else 0)
        y += 10
    if y > BOTTOM:
        raise RuntimeError(f"{filename} runs past one page")
    doc.set_metadata({"title": f"{resume['name']} resume", "author": ""})
    doc.save(OUT / filename)
    doc.close()


OUT.mkdir(exist_ok=True)
for filename, resume in RESUMES.items():
    build(filename, resume)
    print(OUT / filename)
