"""Markdown to CV/Resume PDF endpoints.

Hybrid free/pro model:
- FREE: Modern, Professional, Minimal templates + Software Engineer sample
- PRO: All 10 templates + All 10 sample CVs

Usage is tracked for analytics purposes.
"""

import os
import time
import uuid
from typing import Optional

import markdown
from weasyprint import HTML, CSS
from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent, get_current_user_optional
from app.config import settings
from app.models.history import ToolType
from app.models.user import User
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

# Free templates available to all users
FREE_TEMPLATES = {"modern", "professional", "minimal"}

# Free samples available to all users
FREE_SAMPLES = {"software_engineer"}

# CV Templates with professional styling
CV_TEMPLATES = {
    "modern": {
        "name": "Modern",
        "description": "Clean, contemporary design with accent colors",
        "is_free": True,
        "css": """
            @page { size: A4; margin: 15mm 20mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 0; font-size: 10pt; }
            h1 { color: #2563eb; font-size: 24pt; margin: 0 0 5px 0; font-weight: 700; letter-spacing: -0.5px; }
            h2 { color: #1e40af; font-size: 12pt; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin: 18px 0 10px 0; text-transform: uppercase; letter-spacing: 1px; }
            h3 { color: #374151; font-size: 11pt; margin: 10px 0 3px 0; font-weight: 600; }
            h4 { color: #6b7280; font-size: 10pt; margin: 0; font-weight: 400; font-style: italic; }
            p { margin: 4px 0; }
            ul { margin: 5px 0; padding-left: 18px; }
            li { margin: 2px 0; }
            strong { color: #1f2937; }
            a { color: #2563eb; text-decoration: none; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 15px 0; }
            code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
            .contact-info { color: #6b7280; font-size: 9pt; margin-bottom: 15px; }
        """
    },
    "professional": {
        "name": "Professional",
        "description": "Traditional corporate style with serif fonts",
        "is_free": True,
        "css": """
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; font-size: 10.5pt; }
            h1 { color: #1a1a1a; font-size: 22pt; margin: 0 0 8px 0; font-weight: 400; text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
            h2 { color: #1a1a1a; font-size: 11pt; border-bottom: 1px solid #999; padding-bottom: 3px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 400; }
            h3 { color: #333; font-size: 11pt; margin: 12px 0 2px 0; font-weight: 600; }
            h4 { color: #666; font-size: 10pt; margin: 0; font-weight: 400; }
            p { margin: 5px 0; text-align: justify; }
            ul { margin: 5px 0; padding-left: 20px; }
            li { margin: 3px 0; }
            a { color: #1a1a1a; }
            hr { border: none; border-top: 1px solid #ccc; margin: 15px 0; }
        """
    },
    "minimal": {
        "name": "Minimal",
        "description": "Simple and elegant with plenty of whitespace",
        "is_free": True,
        "css": """
            @page { size: A4; margin: 20mm 25mm; }
            body { font-family: 'Helvetica', Arial, sans-serif; line-height: 1.5; color: #444; margin: 0; padding: 0; font-size: 10pt; }
            h1 { color: #222; font-size: 20pt; margin: 0 0 5px 0; font-weight: 300; letter-spacing: 2px; }
            h2 { color: #222; font-size: 9pt; margin: 25px 0 12px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 400; }
            h3 { color: #222; font-size: 10.5pt; margin: 12px 0 2px 0; font-weight: 500; }
            h4 { color: #888; font-size: 9pt; margin: 0; font-weight: 300; }
            p { margin: 4px 0; }
            ul { margin: 5px 0; padding-left: 15px; list-style-type: none; }
            ul li:before { content: "—"; margin-right: 8px; color: #999; }
            li { margin: 3px 0; }
            a { color: #444; text-decoration: none; border-bottom: 1px solid #ddd; }
            hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
        """
    },
    "creative": {
        "name": "Creative",
        "description": "Bold design for creative professionals",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', 'Roboto', sans-serif; line-height: 1.4; color: #2d3748; margin: 0; padding: 0; font-size: 10pt; }
            h1 { color: #5b21b6; font-size: 28pt; margin: 0 0 5px 0; font-weight: 800; }
            h2 { color: #7c3aed; font-size: 11pt; margin: 20px 0 10px 0; font-weight: 700; padding: 5px 10px; background: linear-gradient(90deg, #f5f3ff, transparent); border-left: 3px solid #7c3aed; }
            h3 { color: #4c1d95; font-size: 11pt; margin: 12px 0 3px 0; font-weight: 600; }
            h4 { color: #6b7280; font-size: 9.5pt; margin: 0; font-weight: 400; }
            p { margin: 4px 0; }
            ul { margin: 5px 0; padding-left: 18px; }
            li { margin: 3px 0; }
            strong { color: #5b21b6; }
            a { color: #7c3aed; text-decoration: none; }
            hr { border: none; height: 2px; background: linear-gradient(90deg, #7c3aed, #a78bfa, transparent); margin: 15px 0; }
            code { background: #f5f3ff; color: #5b21b6; padding: 2px 6px; border-radius: 4px; }
        """
    },
    "executive": {
        "name": "Executive",
        "description": "Sophisticated design for senior positions",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 18mm 22mm; }
            body { font-family: 'Cambria', Georgia, serif; line-height: 1.5; color: #1f2937; margin: 0; padding: 0; font-size: 10.5pt; }
            h1 { color: #0f172a; font-size: 22pt; margin: 0 0 3px 0; font-weight: 400; letter-spacing: 1px; }
            h2 { color: #0f172a; font-size: 10pt; margin: 22px 0 10px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; border-bottom: 1px solid #334155; padding-bottom: 5px; }
            h3 { color: #1e293b; font-size: 11pt; margin: 12px 0 2px 0; font-weight: 600; }
            h4 { color: #64748b; font-size: 9.5pt; margin: 0 0 3px 0; font-weight: 400; }
            p { margin: 5px 0; }
            ul { margin: 6px 0; padding-left: 18px; }
            li { margin: 4px 0; }
            a { color: #334155; text-decoration: none; }
            hr { border: none; border-top: 2px solid #0f172a; margin: 12px 0; }
        """
    },
    "tech": {
        "name": "Tech",
        "description": "Modern design for tech professionals",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 15mm 18mm; }
            body { font-family: 'SF Pro Display', -apple-system, 'Segoe UI', sans-serif; line-height: 1.4; color: #1e293b; margin: 0; padding: 0; font-size: 10pt; background: #fff; }
            h1 { color: #0ea5e9; font-size: 24pt; margin: 0 0 5px 0; font-weight: 700; }
            h2 { color: #0284c7; font-size: 11pt; margin: 18px 0 10px 0; font-weight: 600; padding-bottom: 5px; border-bottom: 2px solid #0ea5e9; }
            h3 { color: #0f172a; font-size: 11pt; margin: 10px 0 2px 0; font-weight: 600; }
            h4 { color: #64748b; font-size: 9.5pt; margin: 0; font-weight: 400; }
            p { margin: 4px 0; }
            ul { margin: 5px 0; padding-left: 18px; }
            li { margin: 2px 0; }
            code { background: #f0f9ff; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 9pt; }
            a { color: #0284c7; text-decoration: none; }
            hr { border: none; border-top: 1px solid #e2e8f0; margin: 15px 0; }
            strong { color: #0369a1; }
        """
    },
    "academic": {
        "name": "Academic",
        "description": "Formal style for academic and research positions",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 20mm 25mm; }
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; margin: 0; padding: 0; font-size: 11pt; }
            h1 { color: #000; font-size: 16pt; margin: 0 0 5px 0; font-weight: 700; text-align: center; }
            h2 { color: #000; font-size: 12pt; margin: 18px 0 8px 0; font-weight: 700; text-transform: uppercase; }
            h3 { color: #000; font-size: 11pt; margin: 10px 0 2px 0; font-weight: 700; }
            h4 { color: #333; font-size: 10pt; margin: 0; font-weight: 400; font-style: italic; }
            p { margin: 5px 0; text-align: justify; }
            ul { margin: 5px 0; padding-left: 25px; }
            li { margin: 3px 0; }
            a { color: #000; }
            hr { border: none; border-top: 1px solid #000; margin: 12px 0; }
        """
    },
    "elegant": {
        "name": "Elegant",
        "description": "Refined and sophisticated design",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 18mm 22mm; }
            body { font-family: 'Garamond', 'Palatino', serif; line-height: 1.5; color: #2c2c2c; margin: 0; padding: 0; font-size: 10.5pt; }
            h1 { color: #8b5cf6; font-size: 26pt; margin: 0 0 8px 0; font-weight: 400; letter-spacing: 2px; border-bottom: 1px solid #c4b5fd; padding-bottom: 8px; }
            h2 { color: #6d28d9; font-size: 10pt; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 400; }
            h3 { color: #4c1d95; font-size: 11pt; margin: 12px 0 3px 0; font-weight: 600; }
            h4 { color: #7c7c7c; font-size: 9.5pt; margin: 0; font-weight: 400; font-style: italic; }
            p { margin: 5px 0; }
            ul { margin: 5px 0; padding-left: 20px; }
            li { margin: 3px 0; }
            a { color: #6d28d9; text-decoration: none; }
            hr { border: none; border-top: 1px solid #e9d5ff; margin: 15px 0; }
        """
    },
    "compact": {
        "name": "Compact",
        "description": "Space-efficient layout for detailed CVs",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 12mm 15mm; }
            body { font-family: 'Arial Narrow', Arial, sans-serif; line-height: 1.3; color: #333; margin: 0; padding: 0; font-size: 9pt; }
            h1 { color: #dc2626; font-size: 18pt; margin: 0 0 3px 0; font-weight: 700; }
            h2 { color: #b91c1c; font-size: 9pt; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; background: #fef2f2; padding: 4px 8px; }
            h3 { color: #1f2937; font-size: 9.5pt; margin: 8px 0 1px 0; font-weight: 600; }
            h4 { color: #6b7280; font-size: 8.5pt; margin: 0; font-weight: 400; }
            p { margin: 2px 0; }
            ul { margin: 3px 0; padding-left: 15px; }
            li { margin: 1px 0; }
            a { color: #dc2626; text-decoration: none; }
            hr { border: none; border-top: 1px solid #fecaca; margin: 10px 0; }
        """
    },
    "dark": {
        "name": "Dark Mode",
        "description": "Modern dark theme for digital-first CVs",
        "is_free": False,
        "css": """
            @page { size: A4; margin: 15mm 20mm; }
            body { font-family: 'Inter', 'Segoe UI', sans-serif; line-height: 1.4; color: #e2e8f0; margin: 0; padding: 0; font-size: 10pt; background: #0f172a; }
            h1 { color: #38bdf8; font-size: 24pt; margin: 0 0 5px 0; font-weight: 700; }
            h2 { color: #7dd3fc; font-size: 11pt; margin: 18px 0 10px 0; font-weight: 600; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px; }
            h3 { color: #f1f5f9; font-size: 11pt; margin: 10px 0 2px 0; font-weight: 600; }
            h4 { color: #94a3b8; font-size: 9.5pt; margin: 0; font-weight: 400; }
            p { margin: 4px 0; }
            ul { margin: 5px 0; padding-left: 18px; }
            li { margin: 2px 0; color: #cbd5e1; }
            code { background: #1e293b; color: #38bdf8; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }
            a { color: #38bdf8; text-decoration: none; }
            hr { border: none; border-top: 1px solid #334155; margin: 15px 0; }
            strong { color: #7dd3fc; }
        """
    },
}

# Sample CV templates in markdown
CV_SAMPLES = {
    "software_engineer": {
        "name": "Software Engineer",
        "description": "Template for software developers and engineers",
        "is_free": True,
        "content": """# John Smith
**Senior Software Engineer**

john.smith@email.com | (555) 123-4567 | San Francisco, CA | [linkedin.com/in/johnsmith](https://linkedin.com) | [github.com/johnsmith](https://github.com)

---

## Summary

Experienced software engineer with 8+ years developing scalable web applications and distributed systems. Passionate about clean code, best practices, and mentoring junior developers.

---

## Experience

### Senior Software Engineer
#### Google | Jan 2020 - Present

- Led development of a microservices architecture serving 10M+ daily active users
- Reduced API response times by 40% through optimization and caching strategies
- Mentored team of 5 junior developers, conducting code reviews and pair programming sessions
- Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes

### Software Engineer
#### Meta | Jun 2017 - Dec 2019

- Developed React components for the News Feed team, improving user engagement by 15%
- Built GraphQL APIs handling 1M+ requests per minute
- Collaborated with design team to implement responsive mobile-first interfaces

### Junior Developer
#### Startup Inc | Aug 2015 - May 2017

- Built full-stack features using Python/Django and React
- Implemented automated testing increasing code coverage to 85%
- Participated in agile development with 2-week sprint cycles

---

## Education

### Master of Science in Computer Science
#### Stanford University | 2015

- Focus: Distributed Systems and Machine Learning
- GPA: 3.8/4.0

### Bachelor of Science in Computer Science
#### UC Berkeley | 2013

- Dean's List, Cum Laude
- GPA: 3.7/4.0

---

## Skills

**Languages:** Python, JavaScript, TypeScript, Go, Java, SQL
**Frameworks:** React, Node.js, Django, FastAPI, Spring Boot
**Tools:** Docker, Kubernetes, AWS, GCP, PostgreSQL, Redis, GraphQL
**Practices:** Agile, TDD, CI/CD, Microservices, System Design

---

## Projects

### Open Source Contribution - React Query
- Core contributor to React Query library with 30K+ GitHub stars
- Implemented caching improvements adopted in v4.0

### Personal Project - DevTools CLI
- Built a CLI tool for developers with 5K+ npm downloads
- Featured in JavaScript Weekly newsletter
"""
    },
    "product_manager": {
        "name": "Product Manager",
        "description": "Template for product managers and product owners",
        "is_free": False,
        "content": """# Sarah Johnson
**Senior Product Manager**

sarah.johnson@email.com | (555) 234-5678 | New York, NY | [linkedin.com/in/sarahjohnson](https://linkedin.com)

---

## Summary

Strategic product manager with 7+ years of experience launching successful B2B and B2C products. Proven track record of driving revenue growth through data-driven decision making and cross-functional leadership.

---

## Experience

### Senior Product Manager
#### Stripe | Mar 2021 - Present

- Own product strategy for Stripe Payments platform serving 500K+ businesses
- Launched 3 major features generating $50M+ in additional annual revenue
- Led cross-functional team of 15 engineers, designers, and data scientists
- Increased user activation rate by 35% through onboarding optimization

### Product Manager
#### Airbnb | Jun 2018 - Feb 2021

- Managed guest experience product line with 100M+ annual users
- Launched instant booking feature increasing conversion by 25%
- Conducted 200+ user interviews informing product roadmap priorities
- Collaborated with engineering to reduce booking flow friction by 40%

### Associate Product Manager
#### Microsoft | Aug 2016 - May 2018

- Supported Office 365 collaboration features product team
- Analyzed user data to identify opportunities for feature improvements
- Created product requirements documents and user stories
- Coordinated beta testing programs with 10K+ participants

---

## Education

### MBA
#### Harvard Business School | 2016

- Concentration in Technology and Operations Management

### Bachelor of Science in Economics
#### University of Pennsylvania | 2014

- Minor in Computer Science
- Summa Cum Laude

---

## Skills

**Product:** Roadmap Planning, A/B Testing, User Research, Agile/Scrum, PRDs
**Analytics:** SQL, Amplitude, Mixpanel, Tableau, Google Analytics
**Tools:** Jira, Figma, Notion, Confluence, Productboard
**Leadership:** Cross-functional Leadership, Stakeholder Management, Mentoring

---

## Achievements

- Speaker at ProductCon 2023: "Building Products That Scale"
- Product School Certified Product Manager
- Published in Harvard Business Review on product-led growth strategies
"""
    },
    "ux_designer": {
        "name": "UX Designer",
        "description": "Template for UX/UI designers",
        "is_free": False,
        "content": """# Emily Chen
**Senior UX Designer**

emily.chen@email.com | (555) 345-6789 | Seattle, WA | [emilychen.design](https://portfolio.com) | [dribbble.com/emilychen](https://dribbble.com)

---

## Summary

Creative UX designer with 6+ years crafting intuitive digital experiences. Specialized in design systems, accessibility, and user research. Passionate about creating inclusive designs that delight users.

---

## Experience

### Senior UX Designer
#### Figma | Feb 2021 - Present

- Lead designer for FigJam collaborative whiteboard product
- Created and maintained design system used by 50+ designers globally
- Improved accessibility compliance to WCAG 2.1 AA standards
- Conducted user research studies informing product direction

### UX Designer
#### Spotify | Aug 2018 - Jan 2021

- Designed mobile app features for 400M+ monthly active users
- Led redesign of playlist creation flow increasing completion by 30%
- Collaborated with engineering to prototype and test new interactions
- Mentored 3 junior designers on design processes and tools

### Junior UX Designer
#### Agency XYZ | Jun 2017 - Jul 2018

- Designed responsive websites for Fortune 500 clients
- Created wireframes, prototypes, and high-fidelity mockups
- Conducted usability testing and synthesized findings into actionable insights

---

## Education

### Master of Human-Computer Interaction
#### Carnegie Mellon University | 2017

### Bachelor of Fine Arts in Graphic Design
#### Rhode Island School of Design | 2015

---

## Skills

**Design:** UI Design, Interaction Design, Visual Design, Design Systems, Prototyping
**Research:** User Interviews, Usability Testing, A/B Testing, Surveys, Journey Mapping
**Tools:** Figma, Sketch, Adobe Creative Suite, Framer, Principle, Miro
**Development:** HTML, CSS, Basic React, Design Tokens

---

## Portfolio Highlights

### FigJam Templates Library
Designed template system used by 1M+ users monthly

### Spotify Collaborative Playlists
Led UX for social features increasing playlist shares by 45%

### Accessibility Design Guidelines
Created comprehensive guidelines adopted company-wide
"""
    },
    "data_scientist": {
        "name": "Data Scientist",
        "description": "Template for data scientists and ML engineers",
        "is_free": False,
        "content": """# Michael Park
**Senior Data Scientist**

michael.park@email.com | (555) 456-7890 | Boston, MA | [github.com/michaelpark](https://github.com) | [linkedin.com/in/michaelpark](https://linkedin.com)

---

## Summary

Data scientist with 5+ years of experience building machine learning models and data pipelines at scale. Expert in NLP, recommendation systems, and MLOps. PhD in Computer Science with focus on deep learning.

---

## Experience

### Senior Data Scientist
#### Netflix | Jan 2021 - Present

- Developed recommendation algorithms improving user engagement by 12%
- Built real-time ML pipeline processing 1B+ events daily
- Led A/B testing framework serving 200M+ subscribers
- Published 2 papers on recommendation systems at RecSys conference

### Data Scientist
#### Amazon | Jun 2019 - Dec 2020

- Created demand forecasting models reducing inventory costs by $15M annually
- Built NLP models for customer review analysis and sentiment detection
- Developed automated ML pipeline reducing model training time by 60%
- Mentored 2 junior data scientists on ML best practices

### Research Scientist Intern
#### Google AI | Summer 2018

- Researched transformer architectures for language understanding
- Contributed to BERT fine-tuning experiments
- Co-authored paper published at EMNLP 2019

---

## Education

### PhD in Computer Science
#### MIT | 2019

- Thesis: "Deep Learning for Sequential Recommendation"
- Advisor: Prof. Regina Barzilay

### Bachelor of Science in Mathematics & Computer Science
#### Caltech | 2015

- Summa Cum Laude, GPA: 4.0/4.0

---

## Skills

**ML/AI:** Deep Learning, NLP, Computer Vision, Recommendation Systems, Time Series
**Languages:** Python, R, SQL, Scala, Julia
**Frameworks:** PyTorch, TensorFlow, scikit-learn, Spark MLlib, Hugging Face
**Tools:** AWS SageMaker, MLflow, Airflow, Docker, Kubernetes, Git

---

## Publications

- "Transformer-Based Sequential Recommendations at Scale" - RecSys 2022
- "Efficient Fine-tuning of Large Language Models" - EMNLP 2019
- 500+ citations on Google Scholar

---

## Projects

### Open Source: FastRec
- High-performance recommendation library with 2K+ GitHub stars
- Used by 50+ companies for production recommendation systems
"""
    },
    "marketing_manager": {
        "name": "Marketing Manager",
        "description": "Template for marketing professionals",
        "is_free": False,
        "content": """# Jessica Williams
**Senior Marketing Manager**

jessica.williams@email.com | (555) 567-8901 | Los Angeles, CA | [linkedin.com/in/jessicawilliams](https://linkedin.com)

---

## Summary

Results-driven marketing manager with 8+ years of experience in digital marketing, brand strategy, and team leadership. Proven ability to drive growth through innovative campaigns and data-driven optimization.

---

## Experience

### Senior Marketing Manager
#### HubSpot | Apr 2020 - Present

- Lead team of 8 marketers managing $5M annual marketing budget
- Increased organic traffic by 150% through content marketing strategy
- Launched influencer program generating $2M in attributed revenue
- Improved email open rates by 40% through personalization and A/B testing

### Marketing Manager
#### Shopify | Jul 2017 - Mar 2020

- Managed paid advertising campaigns with $2M monthly spend
- Achieved 3.5x ROAS through campaign optimization and audience targeting
- Led rebranding initiative increasing brand awareness by 45%
- Developed marketing automation workflows reducing CAC by 25%

### Digital Marketing Specialist
#### Agency Creative | Jan 2015 - Jun 2017

- Executed SEO, SEM, and social media campaigns for 20+ clients
- Managed client relationships and delivered monthly performance reports
- Increased client retention rate to 95% through exceptional service

---

## Education

### Master of Business Administration
#### UCLA Anderson School of Management | 2017

- Marketing Concentration

### Bachelor of Arts in Communications
#### USC Annenberg | 2014

- Minor in Business Administration

---

## Skills

**Marketing:** Brand Strategy, Content Marketing, SEO/SEM, Social Media, Email Marketing
**Analytics:** Google Analytics, HubSpot, Salesforce, Tableau, Data Studio
**Advertising:** Google Ads, Meta Ads, LinkedIn Ads, Programmatic
**Leadership:** Team Management, Budget Planning, Vendor Management, Cross-functional Collaboration

---

## Certifications

- Google Analytics Certified
- HubSpot Inbound Marketing Certified
- Meta Blueprint Certified
- Google Ads Search & Display Certified

---

## Achievements

- Marketing Week "Rising Star" Award 2022
- Led campaign winning Webby Award for Best Marketing Campaign
- Speaker at Content Marketing World 2023
"""
    },
    "project_manager": {
        "name": "Project Manager",
        "description": "Template for project and program managers",
        "is_free": False,
        "content": """# David Thompson
**Senior Project Manager, PMP**

david.thompson@email.com | (555) 678-9012 | Chicago, IL | [linkedin.com/in/davidthompson](https://linkedin.com)

---

## Summary

PMP-certified project manager with 10+ years leading complex technical projects from inception to delivery. Expert in Agile and Waterfall methodologies with a track record of on-time, on-budget project delivery.

---

## Experience

### Senior Project Manager
#### Accenture | May 2019 - Present

- Lead program of 5 concurrent projects with combined budget of $25M
- Manage cross-functional teams of 50+ members across 4 time zones
- Achieved 95% on-time delivery rate across 20+ project deliveries
- Implemented PMO best practices reducing project overhead by 20%

### Project Manager
#### Deloitte | Aug 2015 - Apr 2019

- Managed enterprise software implementations for Fortune 500 clients
- Led digital transformation project with $8M budget delivered under budget
- Developed risk management framework adopted firm-wide
- Mentored 5 associate project managers

### Associate Project Manager
#### IBM | Jun 2013 - Jul 2015

- Coordinated project activities for cloud migration initiatives
- Maintained project documentation and stakeholder communications
- Supported senior PMs in resource allocation and timeline management

---

## Education

### Master of Science in Project Management
#### Northwestern University | 2013

### Bachelor of Science in Industrial Engineering
#### Purdue University | 2011

---

## Certifications

- Project Management Professional (PMP)
- Certified Scrum Master (CSM)
- ITIL v4 Foundation
- SAFe 5 Agilist
- AWS Cloud Practitioner

---

## Skills

**Methodologies:** Agile, Scrum, Kanban, Waterfall, Hybrid, SAFe
**Tools:** Jira, MS Project, Asana, Monday.com, Confluence, Smartsheet
**Domains:** Software Development, Cloud Migration, Digital Transformation, ERP Implementation
**Leadership:** Stakeholder Management, Risk Management, Resource Planning, Vendor Management

---

## Key Projects

### Enterprise Cloud Migration - Fortune 100 Retailer
- $15M budget, 18-month timeline, delivered 2 weeks early
- Migrated 500+ applications to AWS
- Led team of 40 engineers and consultants

### Digital Transformation - Financial Services
- $8M budget, 12-month timeline, 15% under budget
- Implemented Salesforce CRM for 5,000+ users
- Achieved 98% user adoption rate
"""
    },
    "financial_analyst": {
        "name": "Financial Analyst",
        "description": "Template for finance professionals",
        "is_free": False,
        "content": """# Amanda Rodriguez
**Senior Financial Analyst**

amanda.rodriguez@email.com | (555) 789-0123 | New York, NY | [linkedin.com/in/amandarodriguez](https://linkedin.com)

---

## Summary

CFA charterholder and senior financial analyst with 7+ years in investment banking and corporate finance. Expert in financial modeling, valuation, and strategic analysis with a track record of supporting $5B+ in transactions.

---

## Experience

### Senior Financial Analyst
#### Goldman Sachs | Feb 2020 - Present

- Lead financial analysis for M&A transactions in technology sector
- Built complex financial models for 15+ deals valued at $3B+
- Advise senior leadership on strategic investments and divestitures
- Mentor team of 4 junior analysts on modeling and valuation techniques

### Financial Analyst
#### Morgan Stanley | Jul 2017 - Jan 2020

- Performed company valuations using DCF, comparable companies, and precedent transactions
- Created investor presentations and management reports
- Supported due diligence for $2B acquisition in healthcare sector
- Developed automated reporting tools saving 20+ hours weekly

### Junior Analyst
#### J.P. Morgan | Jun 2015 - Jun 2017

- Assisted in preparation of pitch books and client presentations
- Conducted industry research and competitive analysis
- Maintained financial databases and company tracking models

---

## Education

### Master of Business Administration
#### Columbia Business School | 2020

- Finance Concentration
- Beta Gamma Sigma Honor Society

### Bachelor of Science in Finance
#### NYU Stern School of Business | 2015

- Summa Cum Laude, GPA: 3.9/4.0
- Dean's List all semesters

---

## Certifications & Licenses

- Chartered Financial Analyst (CFA) Charterholder
- Financial Modeling & Valuation Analyst (FMVA)
- Series 7 and Series 63 Licensed

---

## Skills

**Analysis:** Financial Modeling, Valuation (DCF, Comps, LBO), Due Diligence, Forecasting
**Tools:** Excel (Advanced), Bloomberg Terminal, Capital IQ, FactSet, Tableau, Python
**Domains:** M&A, Private Equity, Investment Banking, Corporate Finance
**Soft Skills:** Presentation, Client Relations, Cross-functional Collaboration

---

## Notable Transactions

- $1.5B Technology Acquisition - Lead Analyst
- $800M Healthcare Merger - Financial Modeling Lead
- $500M Private Equity Investment - Due Diligence Support
"""
    },
    "hr_manager": {
        "name": "HR Manager",
        "description": "Template for human resources professionals",
        "is_free": False,
        "content": """# Rachel Kim
**Senior HR Manager**

rachel.kim@email.com | (555) 890-1234 | Austin, TX | [linkedin.com/in/rachelkim](https://linkedin.com)

---

## Summary

Strategic HR professional with 9+ years of experience in talent acquisition, employee engagement, and organizational development. SHRM-SCP certified with expertise in building high-performing teams and inclusive cultures.

---

## Experience

### Senior HR Manager
#### Salesforce | Mar 2020 - Present

- Lead HR operations for 2,000+ employee business unit
- Reduced time-to-hire by 35% through ATS optimization and process improvements
- Designed DEI programs increasing underrepresented hiring by 40%
- Implemented employee engagement initiatives improving eNPS from 35 to 65

### HR Manager
#### Dell Technologies | Aug 2017 - Feb 2020

- Managed full-cycle recruitment for engineering teams (100+ hires annually)
- Developed leadership training program for 200+ managers
- Led compensation benchmarking resulting in 15% reduction in turnover
- Administered benefits programs for 5,000+ employees

### HR Generalist
#### Tech Startup | Jun 2014 - Jul 2017

- Built HR function from ground up as company scaled from 20 to 200 employees
- Created employee handbook, policies, and compliance programs
- Implemented HRIS system (Workday) and performance management processes

---

## Education

### Master of Science in Human Resource Management
#### Cornell University ILR School | 2014

### Bachelor of Arts in Psychology
#### University of Texas at Austin | 2012

---

## Certifications

- SHRM Senior Certified Professional (SHRM-SCP)
- Certified Professional in Learning and Performance (CPLP)
- Diversity, Equity & Inclusion Certificate - Cornell
- PHR - Professional in Human Resources

---

## Skills

**HR Functions:** Talent Acquisition, Employee Relations, Compensation & Benefits, L&D, HRIS
**Tools:** Workday, Greenhouse, LinkedIn Recruiter, Culture Amp, 15Five
**Compliance:** EEOC, FLSA, ADA, FMLA, I-9, Multi-state Employment Law
**Leadership:** Team Management, Change Management, Strategic Planning, Executive Coaching

---

## Achievements

- Built recruiting team of 8, hiring 500+ employees in 2 years
- Designed onboarding program with 95% new hire satisfaction rating
- Speaker at SHRM Annual Conference 2023
- Published article in HR Magazine on remote work culture
"""
    },
    "consultant": {
        "name": "Management Consultant",
        "description": "Template for consultants and advisors",
        "is_free": False,
        "content": """# James Wilson
**Senior Management Consultant**

james.wilson@email.com | (555) 901-2345 | Washington, DC | [linkedin.com/in/jameswilson](https://linkedin.com)

---

## Summary

Strategy consultant with 8+ years at top-tier consulting firms. Expertise in digital transformation, operational excellence, and growth strategy. Trusted advisor to C-suite executives across Fortune 500 companies.

---

## Experience

### Senior Manager
#### McKinsey & Company | Jan 2020 - Present

- Lead engagement teams of 5-10 consultants on strategic transformation projects
- Delivered $200M+ in identified cost savings for manufacturing clients
- Developed thought leadership on AI/ML applications in supply chain
- Mentor 10+ associates and business analysts

### Engagement Manager
#### Boston Consulting Group | Jun 2017 - Dec 2019

- Managed strategy and operations projects for technology and retail sectors
- Led post-merger integration for $2B acquisition
- Created pricing strategy generating $50M annual revenue increase
- Built client relationships resulting in $5M+ in follow-on work

### Consultant
#### Bain & Company | Aug 2015 - May 2017

- Performed market analysis, competitive benchmarking, and financial modeling
- Supported private equity due diligence for 10+ potential investments
- Developed operational improvement recommendations for portfolio companies

---

## Education

### Master of Business Administration
#### Wharton School, University of Pennsylvania | 2015

- Major: Strategic Management
- Palmer Scholar

### Bachelor of Arts in Economics
#### Princeton University | 2013

- Magna Cum Laude
- Phi Beta Kappa

---

## Skills

**Strategy:** Corporate Strategy, Market Entry, M&A, Due Diligence, Growth Strategy
**Operations:** Supply Chain, Operational Excellence, Process Improvement, Digital Transformation
**Analytics:** Financial Modeling, Data Analysis, Market Research, Competitive Analysis
**Tools:** Excel, PowerPoint, Tableau, Alteryx, Python

---

## Industry Expertise

- Technology & Software
- Retail & Consumer Goods
- Manufacturing & Industrial
- Private Equity

---

## Publications & Speaking

- Harvard Business Review: "The Future of Supply Chain Resilience" (2023)
- McKinsey Quarterly: "Digital Transformation in Manufacturing" (2022)
- Speaker at World Economic Forum, Davos 2023
- Guest lecturer at Wharton and Harvard Business School
"""
    },
    "nurse": {
        "name": "Healthcare Professional",
        "description": "Template for nurses and healthcare workers",
        "is_free": False,
        "content": """# Maria Gonzalez, RN, BSN
**Registered Nurse - Critical Care**

maria.gonzalez@email.com | (555) 012-3456 | Miami, FL | [linkedin.com/in/mariagonzalez](https://linkedin.com)

---

## Summary

Compassionate and skilled Critical Care RN with 6+ years of experience in fast-paced ICU environments. Expertise in ventilator management, hemodynamic monitoring, and patient/family education. Committed to delivering exceptional patient-centered care.

---

## Experience

### Senior Staff Nurse - ICU
#### Jackson Memorial Hospital | Feb 2020 - Present

- Provide direct care for critically ill patients in 30-bed medical/surgical ICU
- Precept and mentor 15+ new graduate nurses and nursing students
- Lead rapid response team achieving 95% survival rate
- Serve on hospital Quality Improvement Committee

### Staff Nurse - ICU
#### Mount Sinai Medical Center | Aug 2017 - Jan 2020

- Managed care for 2-3 critically ill patients per shift
- Specialized in post-cardiac surgery and ECMO patient care
- Participated in multidisciplinary rounds and care planning
- Maintained 98% patient satisfaction scores

### Staff Nurse - Medical/Surgical
#### Baptist Hospital | Jun 2016 - Jul 2017

- Provided comprehensive care for 5-6 patients on acute medical unit
- Administered medications and monitored patient conditions
- Collaborated with physicians, therapists, and case managers

---

## Education

### Master of Science in Nursing - Leadership
#### University of Miami | In Progress (Expected 2025)

### Bachelor of Science in Nursing
#### Florida International University | 2016

- Magna Cum Laude

### Associate Degree in Nursing
#### Miami Dade College | 2014

---

## Licenses & Certifications

- Registered Nurse - Florida License (Active)
- Critical Care Registered Nurse (CCRN)
- Basic Life Support (BLS) Instructor
- Advanced Cardiovascular Life Support (ACLS)
- Pediatric Advanced Life Support (PALS)
- NIH Stroke Scale Certified

---

## Skills

**Clinical:** Ventilator Management, Hemodynamic Monitoring, Central Lines, ECMO, CRRT
**Assessment:** Critical Thinking, Patient Assessment, Care Planning, Documentation
**Technology:** Epic EMR, Philips Monitoring, Alaris IV Pumps, Point-of-Care Testing
**Soft Skills:** Patient Education, Family Support, Team Collaboration, Crisis Management

---

## Professional Memberships

- American Association of Critical-Care Nurses (AACN)
- Emergency Nurses Association (ENA)
- Florida Nurses Association

---

## Achievements

- ICU Nurse of the Year 2022
- Daisy Award for Extraordinary Nursing 2021
- Published case study in Critical Care Nurse journal
"""
    },
}


class CvRequest(BaseModel):
    """Request for CV generation."""
    content: str = Field(..., description="Markdown content for the CV")
    template: str = Field(default="modern", description="CV template style")
    title: Optional[str] = Field(default=None, description="Document title")


class CvResponse(BaseModel):
    """Response for CV generation."""
    success: bool
    download_url: Optional[str] = None
    error: Optional[str] = None
    stats: Optional[dict] = None


class SampleResponse(BaseModel):
    """Response for sample templates."""
    samples: list[dict]


class TemplateResponse(BaseModel):
    """Response for CV templates."""
    templates: list[dict]


def is_pro_user(user: Optional[User]) -> bool:
    """Check if user has pro access."""
    if not user:
        return False
    # Check if user is a superuser (admins have pro access)
    if user.is_superuser:
        return True
    # Check user's subscription tier from subscriptions relationship
    if user.subscriptions:
        for sub in user.subscriptions:
            if sub.tier.value in ("pro", "premium", "unlimited") and sub.is_active():
                return True
    return False


@router.post("/generate", response_model=CvResponse)
async def generate_cv(
    data: CvRequest,
    user: Optional[User] = Depends(get_current_user_optional),
    session: DbSession = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Generate a CV/Resume PDF from Markdown content.

    FREE templates: Modern, Professional, Minimal
    PRO templates: Creative, Executive, Tech, Academic, Elegant, Compact, Dark
    """
    start_time = time.time()
    try:
        # Get template
        template = CV_TEMPLATES.get(data.template, CV_TEMPLATES["modern"])

        # Check if template requires pro access
        if not template.get("is_free", False) and not is_pro_user(user):
            return CvResponse(
                success=False,
                error=f"The '{template['name']}' template requires a Pro subscription. Please upgrade or use a free template (Modern, Professional, or Minimal)."
            )

        template_css = template["css"]

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=[
            'tables',
            'fenced_code',
            'nl2br',
            'sane_lists',
        ])
        html_content = md.convert(data.content)

        # Wrap in full HTML document
        title = data.title or "CV"
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Convert to PDF
        html = HTML(string=full_html)
        css = CSS(string=template_css)
        pdf_bytes = html.write_pdf(stylesheets=[css])

        # Save to temp file
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.pdf"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        # Track usage for analytics
        processing_time = int((time.time() - start_time) * 1000)
        usage_service = UsageService(session)
        await usage_service.record_usage_analytics_only(
            tool=ToolType.CV,
            operation="generate",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "content_length": len(data.content),
                "template": data.template,
                "is_free_template": template.get("is_free", False),
            },
            output_metadata={
                "pdf_size": len(pdf_bytes),
            },
            processing_time_ms=processing_time,
        )

        return CvResponse(
            success=True,
            download_url=f"/api/v1/tools/cv/download/{filename}",
            stats={
                "markdown_length": len(data.content),
                "pdf_size_bytes": len(pdf_bytes),
                "template": data.template,
            }
        )
    except Exception as e:
        return CvResponse(
            success=False,
            error=str(e)
        )


@router.get("/download/{filename}")
async def download_cv(filename: str):
    """Download generated CV PDF."""
    if not filename or ".." in filename or "/" in filename:
        return {"error": "Invalid filename"}

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        return {"error": "File not found or expired"}

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename="cv.pdf",
    )


@router.post("/preview")
async def preview_cv(
    data: CvRequest,
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Generate a CV PDF preview and return as base64.

    FREE templates: Modern, Professional, Minimal
    PRO templates: Creative, Executive, Tech, Academic, Elegant, Compact, Dark
    """
    try:
        import base64

        # Get template
        template = CV_TEMPLATES.get(data.template, CV_TEMPLATES["modern"])

        # Check if template requires pro access
        if not template.get("is_free", False) and not is_pro_user(user):
            return {
                "success": False,
                "error": f"The '{template['name']}' template requires a Pro subscription.",
                "requires_pro": True,
            }

        template_css = template["css"]

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=[
            'tables',
            'fenced_code',
            'nl2br',
            'sane_lists',
        ])
        html_content = md.convert(data.content)

        # Wrap in full HTML document
        title = data.title or "CV"
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Convert to PDF
        html = HTML(string=full_html)
        css = CSS(string=template_css)
        pdf_bytes = html.write_pdf(stylesheets=[css])

        # Return as base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

        return {
            "success": True,
            "pdf_base64": pdf_base64,
            "size_bytes": len(pdf_bytes),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/templates", response_model=TemplateResponse)
async def get_templates():
    """Get available CV templates with free/pro status."""
    return TemplateResponse(
        templates=[
            {
                "id": tid,
                "name": t["name"],
                "description": t["description"],
                "is_free": t.get("is_free", False),
            }
            for tid, t in CV_TEMPLATES.items()
        ]
    )


@router.get("/samples", response_model=SampleResponse)
async def get_samples():
    """Get available sample CV templates with free/pro status."""
    return SampleResponse(
        samples=[
            {
                "id": sid,
                "name": s["name"],
                "description": s["description"],
                "is_free": s.get("is_free", False),
            }
            for sid, s in CV_SAMPLES.items()
        ]
    )


@router.get("/samples/{sample_id}")
async def get_sample_content(
    sample_id: str,
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Get content of a specific sample CV."""
    sample = CV_SAMPLES.get(sample_id)
    if not sample:
        return {"error": "Sample not found"}

    # Check if sample requires pro access
    if not sample.get("is_free", False) and not is_pro_user(user):
        return {
            "error": f"The '{sample['name']}' sample requires a Pro subscription. Please upgrade or use the free Software Engineer sample.",
            "requires_pro": True,
        }

    return {
        "id": sample_id,
        "name": sample["name"],
        "description": sample["description"],
        "content": sample["content"],
        "is_free": sample.get("is_free", False),
    }
