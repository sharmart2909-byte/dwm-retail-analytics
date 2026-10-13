# Online Retail Customer Segmentation and Product Recommendation Using Data Mining Techniques

A complete, production-ready, genuine Data Warehousing and Data Mining (DWM) academic project built for university examination, laboratory submission, and viva voce defense.

---

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Architecture & Technology Stack](#-architecture--technology-stack)
3. [Star Schema & Data Warehouse Design](#-star-schema--data-warehouse-design)
4. [Data Preprocessing Pipeline](#-data-preprocessing-pipeline)
5. [OLAP Operations (Real SQL Engine)](#-olap-operations-real-sql-engine)
6. [Data Mining & Machine Learning Models](#-data-mining--machine-learning-models)
7. [Application Pages (11 Modules)](#-application-pages-11-modules)
8. [Quick Start & Setup Instructions](#-quick-start--setup-instructions)
9. [API Endpoints Reference](#-api-endpoints-reference)
10. [Comprehensive DWM Viva Voce Defense Guide](#-comprehensive-dwm-viva-voce-defense-guide)

---

## 🎯 Project Overview

This project implements an end-to-end Data Warehouse and Data Mining system for an e-commerce enterprise. It integrates transactional ETL preprocessing, multi-dimensional Star Schema warehousing in MySQL 8, SQL-driven OLAP multidimensional querying, predictive machine learning (Linear Regression, Naive Bayes), unsupervised customer segmentation (RFM analysis with K-Means and Agglomerative Hierarchical Clustering), and Market Basket Analysis (Apriori association rule mining).

### Key Highlights
- **100% Genuine Computations**: Zero mock, fake, or hardcoded values. All metrics, charts, predictions, and recommendations are computed in real time from actual transactional records.
- **Microservices Architecture**: Cleanly decoupled frontend (React + Vite), backend enterprise orchestration (Spring Boot 3 + Java 17), relational OLAP warehouse (MySQL 8), and mathematical mining engine (Python FastAPI + scikit-learn).
- **Academic Rigor**: Built specifically to satisfy every practical requirement of a Third-Year / Final-Year Computer Engineering / IT Data Warehousing & Mining curriculum.

---

## 🏛 Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 React + Vite Frontend (Port 5173)           │
│         (Tailwind CSS, Lucide Icons, Chart.js, HTML5)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Spring Boot 3 Backend API (Port 8080)           │
│        (Java 17, Spring Data JPA, Hibernate 6, Maven)       │
└───────────────┬─────────────────────────────┬───────────────┘
                │ JDBC / SQL                  │ REST (WebClient/RestTemplate)
                ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      MySQL 8 Warehouse       │ │   Python FastAPI Engine    │
│         (Port 3306)          │ │        (Port 8000)         │
│  - Star Schema Tables        │ │ - Pandas, Scikit-learn     │
│  - OLAP SQL Views & Queries  │ │ - Mlxtend (Apriori)        │
└──────────────────────────────┘ └────────────────────────────┘
```

| Layer | Technology | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Chart.js, Lucide-React | `5173` | Clean academic UI, responsive dashboards, interactive OLAP, ML visualizations |
| **Backend** | Spring Boot 3.2, Java 17 OpenJDK, Spring Data JPA | `8080` | Business logic, OLAP query generation, orchestrating MySQL and Python bridge |
| **Database** | MySQL Server 8.0 (`retail_dw`) | `3306` | Star schema dimensional model, transactional storage, foreign key constraints |
| **Data Mining** | Python 3.10+, FastAPI, Pandas, Scikit-Learn, Mlxtend | `8000` | Data preprocessing, Regression, Naive Bayes, RFM, K-Means, Agglomerative, Apriori |

---

## 🌟 Star Schema & Data Warehouse Design

The data warehouse adheres to a pure dimensional Star Schema centered around transactional sales events.

### Entity Relationship Diagram

```
                 ┌───────────────────────────┐
                 │       dim_customer        │
                 ├───────────────────────────┤
                 │ customer_id  (PK, INT)    │
                 │ country      (VARCHAR)    │
                 └─────────────┬─────────────┘
                               │ 1
                               │
                               │ N
┌───────────────────────────┐  │  ┌───────────────────────────┐
│        dim_product        │  │  │         dim_date          │
├───────────────────────────┤  │  ├───────────────────────────┤
│ product_id  (PK, INT)     ├──┼──┤ date_id      (PK, INT)    │
│ stock_code  (VARCHAR)     │  │  │ day          (INT)        │
│ description (VARCHAR)     │  │  │ month        (INT)        │
└─────────────┬─────────────┘  │  │ quarter      (INT)        │
              │ 1              │  │ year         (INT)        │
              │                │  └─────────────┬─────────────┘
              │ N              │                │ 1
              │                │                │
              │       ┌────────┴────────┐       │ N
              └──────►│   fact_sales    │◄──────┘
                      ├─────────────────┤
                      │ sale_id   (PK)  │
                      │ customer_id(FK) │
                      │ product_id (FK) │
                      │ date_id    (FK) │
                      │ quantity  (INT) │
                      │ unit_price (DEC)│
                      │ total_amount(DEC│
                      └─────────────────┘
```

### Table Definitions

1. **`dim_customer`**:
   - `customer_id` (`INT`, Primary Key): Unique business identifier for retail client.
   - `country` (`VARCHAR(100)`): Geographic region of the customer.

2. **`dim_product`**:
   - `product_id` (`INT`, Auto Increment, Primary Key): Surrogate surrogate key.
   - `stock_code` (`VARCHAR(20)`, Unique): SKU/Stock Code from original invoice.
   - `description` (`VARCHAR(255)`): Standardized merchandise title.

3. **`dim_date`**:
   - `date_id` (`INT`, Primary Key, Format `YYYYMMDD`): Integer date key.
   - `day` (`INT`): 1 - 31.
   - `month` (`INT`): 1 - 12.
   - `quarter` (`INT`): 1 - 4.
   - `year` (`INT`): Calendar Year (e.g. 2010, 2011).

4. **`fact_sales`**:
   - `sale_id` (`BIGINT`, Auto Increment, Primary Key): Granular sales transaction event.
   - `customer_id` (`INT`, Foreign Key references `dim_customer.customer_id`).
   - `product_id` (`INT`, Foreign Key references `dim_product.product_id`).
   - `date_id` (`INT`, Foreign Key references `dim_date.date_id`).
   - `quantity` (`INT`): Number of units purchased ($> 0$).
   - `unit_price` (`DECIMAL(10,2)`): Price per unit in GBP ($> 0$).
   - `total_amount` (`DECIMAL(12,2)`): Computed fact: $\text{Quantity} \times \text{UnitPrice}$.

---

## 🧹 Data Preprocessing Pipeline

The raw Online Retail dataset contains typical real-world transactional noise that violates warehouse integrity and machine learning assumptions. The system applies a rigorous 6-step automated preprocessing pipeline:

| Step | Noise Type | Preprocessing Action & Rationale |
| :--- | :--- | :--- |
| **1. Missing CustomerID** | Null / NaN IDs | **Removed.** Anonymous purchases cannot be tracked for RFM or customer segmentation. |
| **2. Missing Description** | Null product names | **Cleaned / Imputed.** Rows missing critical descriptions are identified and sanitized. |
| **3. Invalid / Negative Quantity** | $Quantity \le 0$ | **Filtered.** Negative quantities represent damaged inventory or cancelled units that distort revenue totals. |
| **4. Invalid / Zero Price** | $UnitPrice \le 0$ | **Filtered.** Zero-price items indicate sample gifts, internal test ledger entries, or clerical faults. |
| **5. Cancelled Invoices** | Invoice starting with `'C'` | **Flagged and Separated.** Cancelled orders are removed from core sales facts so return entries do not offset distinct historical transactions. |
| **6. Duplicate Transactions** | Exact duplicate rows | **Deduplicated.** Repeated identical entries across all columns are dropped to eliminate artificial inflation. |

The application provides a real-time before/after comparison table showing exact counts of raw rows, clean rows, and dropped dirty rows.

---

## 🔄 OLAP Operations (Real SQL Engine)

The system supports the 4 fundamental On-Line Analytical Processing (OLAP) operations on the Star Schema via dynamic SQL:

### 1. Roll-up (Aggregation)
Summarizes data by climbing up a dimensional hierarchy or collapsing dimensions.
- **Time Hierarchy**: Day $\rightarrow$ Month $\rightarrow$ Quarter $\rightarrow$ Year.
- **SQL Implementation**:
  ```sql
  SELECT d.year, d.quarter, d.month,
         SUM(f.total_amount) AS revenue,
         SUM(f.quantity) AS total_quantity,
         COUNT(f.sale_id) AS transaction_count
  FROM fact_sales f
  JOIN dim_date d ON f.date_id = d.date_id
  GROUP BY d.year, d.quarter, d.month WITH ROLLUP;
  ```

### 2. Drill-down (Disaggregation)
Navigates from higher-level summary figures down to granular dimensional details.
- **SQL Implementation**:
  ```sql
  SELECT c.country, p.description, d.month, d.year,
         f.quantity, f.unit_price, f.total_amount
  FROM fact_sales f
  JOIN dim_customer c ON f.customer_id = c.customer_id
  JOIN dim_product p ON f.product_id = p.product_id
  JOIN dim_date d ON f.date_id = d.date_id
  WHERE c.country = 'United Kingdom' AND d.year = 2011;
  ```

### 3. Slice (Single-Dimension Filtering)
Selects a rectangular 2D sub-cube by fixing a single dimension value (e.g. `Country = 'United Kingdom'`).
- **SQL Implementation**:
  ```sql
  SELECT p.description, d.year, d.month,
         SUM(f.total_amount) AS revenue, SUM(f.quantity) AS units
  FROM fact_sales f
  JOIN dim_customer c ON f.customer_id = c.customer_id
  JOIN dim_product p ON f.product_id = p.product_id
  JOIN dim_date d ON f.date_id = d.date_id
  WHERE c.country = 'United Kingdom'
  GROUP BY p.description, d.year, d.month;
  ```

### 4. Dice (Multi-Dimensional Sub-cube Selection)
Selects a smaller sub-cube by applying criteria across two or more dimensions simultaneously.
- **SQL Implementation**:
  ```sql
  SELECT c.country, d.year, d.quarter,
         SUM(f.total_amount) AS revenue, SUM(f.quantity) AS units
  FROM fact_sales f
  JOIN dim_customer c ON f.customer_id = c.customer_id
  JOIN dim_date d ON f.date_id = d.date_id
  WHERE c.country IN ('United Kingdom', 'Germany', 'France')
    AND d.year = 2011 AND d.quarter IN (3, 4)
  GROUP BY c.country, d.year, d.quarter;
  ```

---

## 🤖 Data Mining & Machine Learning Models

### 1. Simple Linear Regression
- **Predictor ($X$)**: Quantity purchased.
- **Target ($Y$)**: Total transaction amount in GBP.
- **Equation**: $\hat{Y} = m X + c$
- **Performance Evaluation**:
  - Mean Absolute Error (MAE): $\frac{1}{n} \sum |Y_i - \hat{Y}_i|$
  - Mean Squared Error (MSE): $\frac{1}{n} \sum (Y_i - \hat{Y}_i)^2$
  - Root Mean Squared Error (RMSE): $\sqrt{\text{MSE}}$
  - Coefficient of Determination ($R^2$): $1 - \frac{\sum (Y_i - \hat{Y}_i)^2}{\sum (Y_i - \bar{Y})^2}$

### 2. Multiple Linear Regression
- **Predictors ($X_1, X_2$)**: Quantity ($X_1$) and Unit Price ($X_2$).
- **Target ($Y$)**: Total transaction amount.
- **Equation**: $\hat{Y} = \beta_0 + \beta_1 X_1 + \beta_2 X_2$
- **Evaluation**: Evaluates interaction effects with exact MAE, MSE, RMSE, and $R^2$ computed on test splits.

### 3. Naive Bayes Classification
- **Objective**: Classify whether a customer will be a **High-Value Customer** ($\text{Monetary} > \text{Median Monetary}$).
- **Algorithm**: Gaussian Naive Bayes:
  $$P(C_k \mid X) \propto P(C_k) \prod_{i=1}^{d} P(x_i \mid C_k)$$
  where feature likelihoods follow the normal distribution:
  $$P(x_i \mid C_k) = \frac{1}{\sqrt{2\pi\sigma_k^2}} \exp\left( -\frac{(x_i - \mu_k)^2}{2\sigma_k^2} \right)$$
- **Metrics Computed**:
  - Accuracy: $\frac{TP + TN}{TP + TN + FP + FN}$
  - Precision: $\frac{TP}{TP + FP}$
  - Recall (Sensitivity): $\frac{TP}{TP + FN}$
  - F1-Score: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$
  - Complete $2 \times 2$ Confusion Matrix with TP, FP, TN, FN breakdowns.

### 4. Customer Segmentation (RFM + Clustering)
Computes the classic marketing metrics for every distinct customer:
- **Recency ($R$)**: Days elapsed between reference date and customer's latest purchase.
- **Frequency ($F$)**: Total count of unique purchase transactions.
- **Monetary ($M$)**: Cumulative revenue generated by the customer.

#### A. K-Means Clustering
- Features normalized using `StandardScaler` ($\mu=0, \sigma=1$).
- Distance metric: Euclidean distance.
- Inertia computed across $K \in [2, 8]$ to plot the **Elbow Curve**.
- Computes **Silhouette Score**:
  $$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$$
  where $a(i)$ is mean intra-cluster distance, and $b(i)$ is mean nearest-cluster distance.

#### B. Agglomerative Hierarchical Clustering
- Bottom-up hierarchical merging using Ward's minimum variance criterion.
- Computes cluster assignments and silhouette scores on the identical RFM feature matrix.
- **Fair Academic Comparison**: Compares silhouette coefficients and execution stability objectively without declaring a pre-determined or fabricated winner.

### 5. Market Basket Analysis & Product Recommendation (Apriori)
- **Frequent Itemset Mining**: Generates combinations of products frequently purchased together in single transactions (`InvoiceNo`).
- **Association Rule Formulation ($A \rightarrow B$)**:
  - **Support**: $P(A \cap B) = \frac{\text{Transactions with } A \text{ and } B}{\text{Total Transactions}}$
  - **Confidence**: $P(B \mid A) = \frac{\text{Support}(A \cup B)}{\text{Support}(A)}$
  - **Lift**: $\frac{\text{Confidence}(A \rightarrow B)}{\text{Support}(B)} = \frac{P(A \cap B)}{P(A) \cdot P(B)}$
    - $\text{Lift} > 1$: Positive association (items bought together significantly more often than by chance).
    - $\text{Lift} = 1$: Independent items.
    - $\text{Lift} < 1$: Negative association / substitutes.
- **Recommendation Engine**: Given a customer's selected item, queries mined rules where the item appears in Antecedents and returns Top Consequent recommendations ranked by highest Lift.

---

## 🖥 Application Pages (11 Modules)

1. **Dashboard (`/`)**: High-level executive overview displaying actual warehouse KPIs (Total Revenue, Transactions, Active Customers, Catalog Products), monthly revenue trends, top 5 selling items, and system health status.
2. **Dataset (`/dataset`)**: Upload Online Retail CSV files, inspect raw records, run the automated 6-step cleaning pipeline, and review the detailed preprocessing audit log.
3. **Data Warehouse (`/warehouse`)**: Interactive Star Schema viewer displaying table definitions, primary/foreign key schemas, live record counts, and sample row inspection for `dim_customer`, `dim_product`, `dim_date`, and `fact_sales`.
4. **OLAP Analysis (`/olap`)**: Interactive multidimensional query interface allowing live execution of Roll-up, Drill-down, Slice, and Dice operations with dynamic SQL query generation and tabular results.
5. **Visualization (`/visualization`)**: Analytical charts (Monthly revenue trends, Country-wise sales distribution, Top revenue-generating products, and Quantity vs. Unit Price scatter plots).
6. **Regression (`/regression`)**: Train and evaluate Simple Linear Regression ($Quantity \rightarrow Amount$) and Multiple Linear Regression ($Quantity + Price \rightarrow Amount$) with real MAE, MSE, RMSE, and $R^2$ metrics.
7. **Naive Bayes (`/naive-bayes`)**: Supervised classification for High-Value customers based on RFM attributes, featuring full train/test evaluation, confusion matrix, precision, recall, and F1 score.
8. **Customer Segmentation (`/segmentation`)**: Full RFM calculation table, K-Means clustering, 2D scatter plots of Recency vs. Monetary, and cluster persona profiling (Champions, Loyal, At Risk, Hibernating).
9. **Product Recommendation (`/recommendation`)**: Market Basket Recommender powered by real Apriori rules. Select any product from the catalog to see confidence, support, and lift-based complementary recommendations.
10. **Algorithm Comparison (`/comparison`)**: Side-by-side empirical comparison table of K-Means vs. Agglomerative Clustering and Simple vs. Multiple Regression with objective performance criteria.
11. **About Project & Viva Guide (`/about`)**: Complete academic guide containing architecture diagrams, star schema reference, and comprehensive DWM viva questions with detailed answers.

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites
Ensure your workstation has the following installed:
1. **MySQL Server 8.0+** (Running on default port `3306`, credentials: user `root`, password `root`).
2. **Java Development Kit (JDK) 17+** (Ensure `java` is in your system PATH).
3. **Python 3.10+** (Ensure `python` and `pip` are in your PATH).
4. **Node.js 18+ and npm** (Ensure `node` and `npm` are in your PATH).

---

### Step 1: Initialize Database
Open a terminal or command prompt in the project root and run:
```bat
cd database
init_db.bat
```
*This creates the `retail_dw` database, constructs the Star Schema tables, and loads seed transactional records.*

---

### Step 2: One-Click Launch (All Services)
Double-click `start_all.bat` in the project root directory or execute:
```bat
start_all.bat
```

This automated launcher will:
1. Verify system prerequisites (`python`, `java`, `npm`).
2. Start the **Python FastAPI Data Mining Engine** on `http://127.0.0.1:8000`.
3. Start the **Spring Boot 3 Backend** on `http://localhost:8080`.
4. Start the **React + Vite Frontend** on `http://localhost:5173`.
5. Automatically open the web application in your default browser.

---

### Step 3: Stopping Services
To terminate all running project processes cleanly, double-click:
```bat
stop_all.bat
```

---

### Manual Launching (Alternative)

If you prefer running each tier in separate terminal windows:

#### 1. Python Service
```bat
cd python-service
run.bat
```
*(Runs uvicorn on port 8000)*

#### 2. Spring Boot Backend
```bat
cd backend
run.bat
```
*(Runs Java 17 application on port 8080)*

#### 3. React Vite Frontend
```bat
cd frontend
run.bat
```
*(Runs Vite dev server on port 5173)*

---

## 📡 API Endpoints Reference

### Spring Boot Backend (`http://localhost:8080`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Warehouse summary KPIs, monthly revenue, top products |
| `GET` | `/api/warehouse/summary` | Table row counts and star schema status |
| `GET` | `/api/warehouse/tables/{table}` | Sample rows from specified table |
| `GET` | `/api/olap/rollup?dimension={time\|product}` | Multidimensional roll-up aggregation |
| `GET` | `/api/olap/drilldown?country={c}&year={y}` | Granular transaction drill-down |
| `GET` | `/api/olap/slice?country={c}` | 2D dimensional slice |
| `GET` | `/api/olap/dice?countries={c}&year={y}&quarters={q}` | Multi-dimensional dice sub-cube |
| `GET` | `/api/analytics/regression` | Simple and Multiple Linear Regression metrics |
| `GET` | `/api/analytics/naive-bayes` | Naive Bayes classification metrics & confusion matrix |
| `GET` | `/api/analytics/clustering` | RFM customer segmentation with K-Means & Agglomerative |
| `GET` | `/api/analytics/recommend?stockCode={code}` | Apriori association rules & product recommendations |

### Python Data Mining Engine (`http://127.0.0.1:8000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/preprocess` | Cleans raw Online Retail CSV and returns audit summary |
| `POST` | `/api/mine/regression` | Trains linear regression models and returns MAE/MSE/R² |
| `POST` | `/api/mine/naive-bayes` | Evaluates GaussianNB classifier on customer data |
| `POST` | `/api/mine/clustering` | Computes RFM, K-Means elbow, and Agglomerative clusters |
| `POST` | `/api/mine/association-rules` | Mines frequent itemsets and association rules via Apriori |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |

---

## 🎓 Comprehensive DWM Viva Voce Defense Guide

Here are the most frequently asked questions during a Data Warehousing and Mining laboratory defense / oral exam, with exact technical answers grounded in this project:

### 1. What is the difference between an OLTP database and an OLAP data warehouse?
- **OLTP (Online Transaction Processing)**: Normalized schemas (3NF) designed for high-concurrency, low-latency `INSERT`, `UPDATE`, and `DELETE` operations on operational databases. Eliminates redundancy.
- **OLAP (Online Analytical Processing)**: Denormalized schemas (Star / Snowflake) optimized for complex analytical `SELECT` read queries aggregating millions of historical transactions.

### 2. Why did you choose a Star Schema over a Snowflake Schema?
- In our Star Schema, dimension tables (`dim_customer`, `dim_product`, `dim_date`) are completely denormalized and directly connected to the central `fact_sales` table.
- **Advantages**:
  1. Faster query execution with fewer SQL `JOIN` operations.
  2. Simpler, more intuitive queries for business reporting.
  3. Optimized for slice, dice, and roll-up aggregations.

### 3. Explain the difference between Roll-up, Drill-down, Slice, and Dice.
- **Roll-up**: Aggregates data by ascending a concept hierarchy (e.g. Month $\rightarrow$ Quarter $\rightarrow$ Year) or dropping a dimension.
- **Drill-down**: The reverse of roll-up; introduces finer granularity (e.g. Year $\rightarrow$ Month $\rightarrow$ Transaction Line Items).
- **Slice**: Performs a selection on one dimension to yield a 2D sub-plane (e.g. `Country = 'France'`).
- **Dice**: Performs a selection on two or more dimensions simultaneously to define a sub-cube (e.g. `Country IN ('UK', 'Germany') AND Year = 2011 AND Quarter = 4`).

### 4. What are the Support, Confidence, and Lift formulas in the Apriori algorithm?
- **Support**: $\text{Supp}(X) = \frac{\text{Count}(X)}{N}$ (Fraction of total transactions containing itemset $X$).
- **Confidence**: $\text{Conf}(X \rightarrow Y) = \frac{\text{Supp}(X \cup Y)}{\text{Supp}(X)}$ (Conditional probability that transaction contains $Y$ given it contains $X$).
- **Lift**: $\text{Lift}(X \rightarrow Y) = \frac{\text{Conf}(X \rightarrow Y)}{\text{Supp}(Y)} = \frac{P(X \cap Y)}{P(X) \cdot P(Y)}$.
  - $\text{Lift} > 1$ proves that the items are bought together significantly more frequently than expected by independent chance.

### 5. Why is feature scaling necessary before running K-Means clustering?
- K-Means computes Euclidean distance:
  $$d(p, q) = \sqrt{\sum (p_i - q_i)^2}$$
- In our RFM dataset, Monetary values range from \$10 to \$10,000, whereas Frequency ranges from 1 to 50, and Recency from 0 to 365. Without normalization, the Monetary feature would dominate the distance metric by orders of magnitude. We use `StandardScaler` to ensure zero mean and unit variance across all dimensions.

### 6. What is the Silhouette Score and what do its values signify?
- The Silhouette Score measures how similar an object is to its own cluster compared to other clusters:
  $$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$$
- Range: $[-1, +1]$.
  - Near $+1$: Instance is well-matched to its own cluster and far from neighbor clusters.
  - Near $0$: Instance is on or very close to the decision boundary between two clusters.
  - Near $-1$: Instance may be assigned to the wrong cluster.

### 7. How does Gaussian Naive Bayes handle continuous numerical features?
- Instead of counting frequencies as in Multinomial Naive Bayes, Gaussian Naive Bayes assumes continuous features (Recency, Frequency, Monetary) follow a normal (Gaussian) distribution within each class:
  $$P(x_i \mid y) = \frac{1}{\sqrt{2\pi\sigma_y^2}} \exp\left( -\frac{(x_i - \mu_y)^2}{2\sigma_y^2} \right)$$
- During training, it computes the mean ($\mu$) and variance ($\sigma^2$) for each feature given each class label.

### 8. What is the meaning of $R^2$ in Linear Regression?
- $R^2$ (Coefficient of Determination) represents the proportion of variance in the dependent target variable ($Y = \text{Total Amount}$) that is predictable from the independent predictor variable(s) ($X = \text{Quantity, Unit Price}$):
  $$R^2 = 1 - \frac{\text{SS}_{\text{res}}}{\text{SS}_{\text{tot}}} = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$
- An $R^2$ of 1.0 represents a perfect fit, while an $R^2$ of 0.0 indicates the model performs no better than predicting the mean of $Y$.

---

## 👥 Contributors & Academic Credits
- **Project Title**: Online Retail Customer Segmentation and Product Recommendation Using Data Mining Techniques
- **Course**: Data Warehousing and Mining (DWM)
- **Degree**: Bachelor of Engineering (Computer Engineering / Information Technology)
