# 🇮🇳 GenXFusion — TrueTax

### AI-Powered Vernacular Invoice Intelligence & GST Automation Platform

**Transform handwritten invoices into structured, GST-compliant digital records using AI-powered OCR, intelligent validation, and automated GST reporting.**

##  Overview

**GenXFusion (TrueTax AI)** is an AI-powered invoice intelligence platform designed to simplify GST compliance for Indian small businesses, shopkeepers, and merchants.

Traditional handwritten invoices contain valuable business information but are difficult to process manually. Extracting product descriptions, quantities, prices, GST rates, and tax amounts requires significant time and is prone to human error.

TrueTax AI addresses this problem by combining computer vision, AI-powered OCR, intelligent HSN matching, mathematical auditing, and GST validation into a unified workflow.

Users can upload handwritten or printed invoices and convert them into structured digital records that can be reviewed, corrected, validated, and exported into GST-compatible formats.

The platform is designed with Indian businesses in mind, including Kirana stores, textile shops, hardware stores, electronics retailers, medical stores, and other small merchants.

---

##  Problem Statement

**Problem Statement #25 — Vernacular OCR Handwritten Invoice-to-GST Formatter**

Small businesses across India frequently maintain handwritten invoices and bills in different languages and regional writing styles.

Manually converting these documents into GST-compliant digital records creates several challenges:

* Difficulty recognizing handwritten text and regional language entries.
* Time-consuming manual invoice data entry.
* Incorrect product classification and HSN codes.
* Errors in GST calculations and tax distribution.
* Difficulty identifying invalid GSTINs.
* Complicated preparation of GST return data.

TrueTax AI aims to reduce these challenges through an intelligent, automated invoice-processing workflow.

---

##  Key Features

### 1. AI-Powered Invoice OCR

* Upload invoice images for automated processing.
* Extract handwritten and printed invoice information.
* Identify product names, quantities, prices, and tax details.
* Convert unstructured invoice images into structured data.
* Use Google Gemini-powered vision processing.

### 2. Intelligent HSN Code Matching

* Automatically identify relevant HSN codes for invoice items.
* Match product descriptions with the HSN catalogue.
* Provide HSN search functionality.
* Help reduce errors in product classification.

### 3. GST Validation & Compliance

* Validate GSTIN formats.
* Identify supplier and buyer GST details.
* Determine intra-state and inter-state transactions.
* Handle CGST, SGST, and IGST calculations.
* Perform invoice compliance checks.

### 4. Mathematical Auditing

* Verify invoice calculations.
* Recalculate item totals and tax amounts.
* Identify mathematical discrepancies.
* Validate invoice summaries against line-item values.

### 5. Automated GST Reporting

* Generate structured invoice records.
* Export invoice information into GSTR-1-compatible JSON.
* Organize transaction information for GST reporting.

### 6. Merchant Authentication

* User registration and login.
* JWT-based authentication.
* SQLite-powered user management.
* Merchant profiles and multiple GSTIN branch management.

### 7. Modern Dashboard

* Responsive React-based frontend.
* Clean and intuitive user interface.
* Invoice processing and review workflow.
* API integration with the FastAPI backend.

---

## 🛠️ Technology Stack

| Category               | Technology        |
| ---------------------- | ----------------- |
| Frontend               | React.js          |
| Frontend Build Tool    | Vite              |
| Styling                | Tailwind CSS      |
| Backend                | Python            |
| Backend Framework      | FastAPI           |
| AI & Vision            | Google Gemini API |
| OCR / Image Processing | OpenCV, Pillow    |
| Data Processing        | NumPy, Pandas     |
| Data Validation        | Pydantic          |
| Database               | SQLite            |
| Authentication         | JWT               |
| API Server             | Uvicorn           |
| API Documentation      | Swagger UI        |

---

## System Architecture

The platform follows a frontend-backend architecture.

```text
              USER
                |
                v
       REACT FRONTEND
          (Vite UI)
                |
                v
          FASTAPI BACKEND
                |
       +--------+---------+
       |                  |
       v                  v
  IMAGE PROCESSING    AUTHENTICATION
  OpenCV / Pillow      SQLite / JWT
       |
       v
   AI VISION ENGINE
    Google Gemini
       |
       v
  STRUCTURED INVOICE
        DATA
       |
       +-----------------------+
       |           |           |
       v           v           v
   GST         HSN MATCH   MATH AUDIT
 VALIDATION       ENGINE      ENGINE
       |           |           |
       +-----------+-----------+
                   |
                   v
           VALIDATED INVOICE
                   |
                   v
             GSTR-1 EXPORT
                   |
                   v
          STRUCTURED GST DATA
```

---

## 📂 Project Structure

```text
GenXFusion/
│
├── backend/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── data/
│
├── static/
│
├── main.py
│
├── auth_db.py
├── schemas.py
├── vision_router.py
├── image_preprocessor.py
├── gst_validator.py
├── hsn_matcher.py
├── math_auditor.py
├── gstr1_exporter.py
│
├── requirements.txt
├── .env.example
├── .gitignore
│
├── DESIGN.md
├── AGENTS.md
│
└── README.md
```

---

##  Installation & Setup

Follow these steps to run the project locally.

### Prerequisites

Make sure you have installed:

* Python 3.10 or higher.
* Node.js and npm.
* Git.
* Google Gemini API key.

### 1. Clone the Repository

```bash
git clone https://github.com/Pranav-Kukreja10/GenXFusion.git
```

Navigate into the project:

```bash
cd GenXFusion
```

### 2. Backend Setup

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**Windows CMD:**

```cmd
venv\Scripts\activate
```

**Linux / macOS:**

```bash
source venv/bin/activate
```

### 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Copy the example configuration:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Add your Google Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key

HOST=127.0.0.1
PORT=8000
DEBUG=True
```

**Important:** Never upload your actual `.env` file or API keys to GitHub.

### 5. Start the Backend Server

Run:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:

```text
http://localhost:8000
```

### 6. Access API Documentation

FastAPI automatically generates interactive API documentation.

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

### 7. Frontend Setup

Open another terminal.

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend will run at the local address displayed by Vite, typically:

```text
http://localhost:5173
```

---

## API Endpoints

The backend exposes RESTful APIs through FastAPI.

### Health Check

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| GET    | `/`              | Root endpoint        |
| GET    | `/api/v1/health` | Backend health check |

### Invoice Processing

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/api/v1/invoice/parse`        | Upload and process an invoice  |
| POST   | `/api/v1/invoice/recalculate`  | Recalculate invoice totals     |
| POST   | `/api/v1/invoice/export-gstr1` | Export invoice data for GSTR-1 |

### HSN Search

| Method | Endpoint             | Description              |
| ------ | -------------------- | ------------------------ |
| GET    | `/api/v1/hsn/search` | Search the HSN catalogue |

Example:

```text
GET /api/v1/hsn/search?q=cement
```

### Authentication

| Method | Endpoint                | Description             |
| ------ | ----------------------- | ----------------------- |
| POST   | `/api/v1/auth/register` | Register a merchant     |
| POST   | `/api/v1/auth/login`    | Authenticate a merchant |

**Note:** Some endpoints also have legacy aliases. Refer to Swagger UI for the complete API schema and request formats.

---

##  Invoice Processing Workflow

The general invoice-processing workflow consists of the following stages:

**Step 1 — Upload**

The user uploads an invoice image through the frontend.

**Step 2 — Image Preprocessing**

The image is prepared for AI processing using image enhancement and preprocessing techniques.

**Step 3 — AI-Based Extraction**

The vision engine extracts invoice information, including:

* Supplier information.
* Customer information.
* Invoice number and date.
* Product descriptions.
* Quantities and unit prices.
* GST rates and amounts.

**Step 4 — HSN Classification**

Extracted product descriptions are matched against the HSN catalogue.

**Step 5 — GST Validation**

The system validates GST-related information and determines applicable tax calculations.

**Step 6 — Mathematical Auditing**

The system checks invoice calculations and identifies inconsistencies.

**Step 7 — Review & Export**

The processed invoice can be reviewed and exported into structured GST reporting data.

---

## Security

The project includes several security-related mechanisms:

* JWT-based authentication.
* Password-protected merchant accounts.
* Environment-based API key configuration.
* Authentication-protected backend operations.
* Local SQLite database for merchant information.

For production deployment, configure restricted CORS origins, HTTPS, secure secret management, and appropriate database access controls.

---

## Testing

The repository includes Python test files covering different application components.

Run the test suite using:

```bash
pytest
```

Alternatively, execute an individual test:

```bash
python test_all.py
```

Additional test files cover invoice processing, preprocessing, mathematical auditing, and related functionality.

---

## Future Improvements

Potential improvements for future versions include:

* Improved recognition of handwritten regional-language invoices.
* Support for additional Indian languages.
* More advanced OCR confidence scoring.
* Better handling of unclear or partially damaged invoices.
* Integration with additional accounting platforms.
* Automated GST return preparation.
* Cloud-based invoice storage.
* Advanced merchant analytics and reporting.
* Production-ready deployment and scalability.

---

## Team & Contributions

GenXFusion is developed collaboratively as part of a hackathon project addressing India's invoice digitization and GST compliance challenges.

We welcome contributions, suggestions, and improvements.

To contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Test your implementation.
5. Submit a pull request.

---

## License

No license has currently been specified for this repository.

A suitable open-source license can be added by the project maintainers.

---

## Acknowledgements

Built with the goal of making digital GST compliance more accessible to Indian small businesses.

**GenXFusion — Turning handwritten bills into intelligent business data.**

---
