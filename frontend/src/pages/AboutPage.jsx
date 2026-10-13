import React from 'react';
import VivaNote from '../components/VivaNote';
import { Info, Layers, Cpu, Database, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">About This Academic Project</h2>
        <p className="page-desc">
          Third-Year College Capstone: Online Retail Customer Segmentation and Product Recommendation Using Data Mining Techniques.
        </p>
      </div>

      {/* Project Overview Card */}
      <div className="card">
        <h3 className="card-title">
          <Info size={18} color="var(--accent-primary)" />
          Project Abstract & Objectives
        </h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: '#334155' }}>
          This project implements a complete, end-to-end Data Warehousing and Data Mining (DWM) architecture for Online Retail analytics. Starting from raw transactional CSV data, it applies systematic ETL data cleaning (handling missing IDs, cancelled invoices, negative quantities, and duplicates) to construct a relational <strong>Star Schema</strong> inside MySQL 8.0. On top of the data warehouse, both <strong>Multidimensional OLAP operations</strong> (Roll-up, Drill-down, Slice, Dice) and <strong>Machine Learning Algorithms</strong> (Linear Regression, Gaussian Naive Bayes, RFM K-Means & Agglomerative Clustering, and Apriori Association Rule Mining) are computed dynamically from real data to empower data-driven customer segmentation and cross-selling recommendations.
        </p>
      </div>

      {/* 4-Tier Architectural Flow */}
      <div className="card">
        <h3 className="card-title">
          <Layers size={18} color="var(--accent-primary)" />
          Four-Tier System Architecture
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', margin: '14px 0' }}>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px' }}>1. Frontend Tier</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>React 18 + Vite</div>
            <p style={{ fontSize: '12.5px', marginTop: '8px', color: '#475569' }}>
              Academic interface with 11 dedicated pages, Chart.js visualizers, clean tables, and responsive sidebar navigation.
            </p>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px' }}>2. Backend Tier</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Spring Boot 3 + Maven (Java 17)</div>
            <p style={{ fontSize: '12.5px', marginTop: '8px', color: '#475569' }}>
              REST API controllers, Spring Data JPA entities, JdbcTemplate OLAP engine, and HTTP bridge to Python service.
            </p>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px' }}>3. Data Warehouse Tier</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MySQL 8.0 (retail_dw)</div>
            <p style={{ fontSize: '12.5px', marginTop: '8px', color: '#475569' }}>
              Star Schema relational store: <code>fact_sales</code> joined with <code>dim_customer</code>, <code>dim_product</code>, and <code>dim_date</code>.
            </p>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', backgroundColor: '#fafafa' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px' }}>4. Data Mining Engine</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Python 3 + FastAPI</div>
            <p style={{ fontSize: '12.5px', marginTop: '8px', color: '#475569' }}>
              Pandas ETL preprocessor, Scikit-learn (Regression, Naive Bayes, K-Means, Agglomerative), and Mlxtend Apriori rule miner.
            </p>
          </div>

        </div>
      </div>

      {/* DWM Viva Quick Reference Cheat-Sheet */}
      <div className="card">
        <h3 className="card-title">
          <Cpu size={18} color="var(--accent-primary)" />
          DWM Viva Defense Question-and-Answer Bank
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px' }}>
            <strong>Q1: What is the Star Schema and why did we choose it over Snowflake?</strong>
            <p style={{ marginTop: '4px', color: '#475569' }}>
              A Star Schema contains a single central fact table connected to non-normalized dimension tables. It was chosen because analytical queries require fewer table JOINs, maximizing OLAP aggregation throughput.
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px' }}>
            <strong>Q2: How does RFM analysis empower Customer Segmentation?</strong>
            <p style={{ marginTop: '4px', color: '#475569' }}>
              Recency measures how recently a customer transacted; Frequency measures how often they purchase; Monetary measures total spend. Together, these 3 orthogonal dimensions reliably distinguish "Champions" from "At-Risk" and "Occasional" customers.
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px' }}>
            <strong>Q3: What does a Lift value greater than 1 signify in Apriori rules?</strong>
            <p style={{ marginTop: '4px', color: '#475569' }}>
              Lift evaluates whether item B is bought more frequently when item A is bought compared to baseline popularity. Lift = Confidence(A &rarr; B) / Support(B). A value &gt; 1 means customers who buy A are significantly more likely to buy B.
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px' }}>
            <strong>Q4: Why does Naive Bayes work well despite the "naive" independence assumption?</strong>
            <p style={{ marginTop: '4px', color: '#475569' }}>
              Even when features exhibit mild correlation, the decision boundary generated by argmax P(C|X) remains remarkably robust because ranking relative probabilities requires order correctness rather than exact probability calibration.
            </p>
          </div>
        </div>
      </div>

      <VivaNote title="DWM Viva Focus: Summary of Course Outcomes Satisfied">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={15} color="var(--success)" /> CO1: Star Schema & Dimensional Modeling
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={15} color="var(--success)" /> CO2: Multidimensional OLAP Cube Operations
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={15} color="var(--success)" /> CO3: Association Rule Mining (Apriori)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={15} color="var(--success)" /> CO4: Supervised Learning (Regression & Naive Bayes)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={15} color="var(--success)" /> CO5: Unsupervised Clustering & Segmentation
          </span>
        </div>
      </VivaNote>
    </div>
  );
}
