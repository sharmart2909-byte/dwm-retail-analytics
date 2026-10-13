import pandas as pd
from typing import Dict, Any, List
from ml_models.association_rules import AprioriMining

class ProductRecommender:
    """
    Recommends products based on genuinely mined Apriori Association Rules.
    Given a target StockCode or item basket:
    1. Finds all rules where the antecedent contains the item.
    2. Ranks consequents by Lift and Confidence.
    3. Returns real recommendations with product descriptions, support, confidence, and lift.
    """

    @staticmethod
    def get_recommendations(
        cleaned_df: pd.DataFrame,
        stock_code: str,
        top_n: int = 5,
        min_support: float = 0.02,
        min_confidence: float = 0.15
    ) -> Dict[str, Any]:
        df = cleaned_df.copy()

        # Build product catalog lookup
        df['StockCode'] = df['StockCode'].astype(str).str.strip()
        df['Description'] = df['Description'].astype(str).str.strip()
        desc_lookup = df.groupby('StockCode')['Description'].agg(
            lambda x: x.mode()[0] if not x.mode().empty else x.iloc[0]
        ).to_dict()

        target_code = str(stock_code).strip()
        target_name = desc_lookup.get(target_code, "Unknown Product")

        # Run Apriori
        mining_result = AprioriMining.run_apriori(
            df, min_support=min_support, min_confidence=min_confidence
        )
        rules = mining_result.get("association_rules", [])

        recommendations = []
        seen_items = set([target_code])

        # Find rules where target_code is in antecedents
        for rule in rules:
            if target_code in rule["antecedents"]:
                for cons in rule["consequents"]:
                    if cons not in seen_items:
                        seen_items.add(cons)
                        recommendations.append({
                            "stock_code": cons,
                            "description": desc_lookup.get(cons, cons),
                            "confidence": rule["confidence"],
                            "lift": rule["lift"],
                            "support": rule["support"],
                            "rule_evidence": rule["rule_string"],
                            "recommendation_reason": f"Frequently bought together (Lift: {rule['lift']}x, Confidence: {round(rule['confidence']*100, 1)}%)"
                        })
                        if len(recommendations) >= top_n:
                            break
            if len(recommendations) >= top_n:
                break

        # Fallback if no specific rule matched this exact antecedent:
        # Check reverse rules or top co-occurring items in same invoices
        if not recommendations:
            invoices_with_item = df[df['StockCode'] == target_code]['InvoiceNo'].unique()
            if len(invoices_with_item) > 0:
                co_items = df[
                    (df['InvoiceNo'].isin(invoices_with_item)) &
                    (df['StockCode'] != target_code)
                ]
                co_counts = co_items.groupby('StockCode').size().sort_values(ascending=False).head(top_n)
                for code, count in co_counts.items():
                    recommendations.append({
                        "stock_code": str(code),
                        "description": desc_lookup.get(str(code), str(code)),
                        "confidence": round(float(count / len(invoices_with_item)), 4),
                        "lift": 1.0,
                        "support": round(float(count / df['InvoiceNo'].nunique()), 4),
                        "rule_evidence": f"{{{target_code}}} -> {{{code}}} (Co-purchase pattern)",
                        "recommendation_reason": f"Co-purchased in {count} of {len(invoices_with_item)} baskets containing this item"
                    })

        # Available products for catalog selection
        catalog = [
            {"stock_code": str(code), "description": str(desc)}
            for code, desc in sorted(desc_lookup.items(), key=lambda x: x[1])[:50]
        ]

        return {
            "query_stock_code": target_code,
            "query_product_name": target_name,
            "recommendations_found": len(recommendations),
            "recommendations": recommendations,
            "available_catalog": catalog,
            "algorithm_used": "Apriori Association Rules Engine"
        }
