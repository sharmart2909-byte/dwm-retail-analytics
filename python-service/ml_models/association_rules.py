import pandas as pd
import numpy as np
from mlxtend.frequent_patterns import apriori, association_rules
from typing import Dict, Any, List

class AprioriMining:
    """
    Mines Frequent Itemsets and Association Rules from genuine Online Retail
    transaction baskets using the Apriori algorithm.
    Calculates Support, Confidence, Lift, Leverage, and Conviction.
    """

    @staticmethod
    def run_apriori(cleaned_df: pd.DataFrame, min_support: float = 0.03, min_confidence: float = 0.2) -> Dict[str, Any]:
        df = cleaned_df.copy()

        # Ensure StockCode, Description, InvoiceNo are strings
        df['StockCode'] = df['StockCode'].astype(str).str.strip()
        df['Description'] = df['Description'].astype(str).str.strip()
        df['InvoiceNo'] = df['InvoiceNo'].astype(str).str.strip()

        # Build stock_code -> description lookup
        desc_lookup = df.groupby('StockCode')['Description'].agg(
            lambda x: x.mode()[0] if not x.mode().empty else x.iloc[0]
        ).to_dict()

        # Build basket matrix: InvoiceNo x StockCode
        basket = df.groupby(['InvoiceNo', 'StockCode'])['Quantity'].sum().unstack().fillna(0)
        basket_bool = (basket > 0)

        total_transactions = len(basket_bool)
        if total_transactions < 2:
            raise ValueError(f"Insufficient transactions ({total_transactions}) for association rule mining.")

        # Adaptive support adjustment to ensure valid rules are discovered
        support_trials = [min_support, 0.05, 0.03, 0.02, 0.01]
        frequent_itemsets = pd.DataFrame()
        effective_support = min_support

        for sup in support_trials:
            try:
                itemsets = apriori(basket_bool, min_support=sup, use_colnames=True, max_len=3)
                if not itemsets.empty and len(itemsets) >= 3:
                    frequent_itemsets = itemsets
                    effective_support = sup
                    break
            except Exception:
                continue

        if frequent_itemsets.empty:
            frequent_itemsets = apriori(basket_bool, min_support=0.01, use_colnames=True, max_len=2)
            effective_support = 0.01

        # Generate Association Rules
        rules_list: List[Dict[str, Any]] = []
        if not frequent_itemsets.empty:
            try:
                raw_rules = association_rules(
                    frequent_itemsets,
                    metric="confidence",
                    min_threshold=min_confidence,
                    num_itemsets=len(frequent_itemsets)
                )
            except Exception:
                # Fallback if lift metric preferred
                try:
                    raw_rules = association_rules(frequent_itemsets, metric="lift", min_threshold=0.5)
                except Exception:
                    raw_rules = pd.DataFrame()

            if not raw_rules.empty:
                # Sort by lift descending
                raw_rules = raw_rules.sort_values(by=['lift', 'confidence'], ascending=[False, False])

                for idx, row in raw_rules.iterrows():
                    ante_codes = list(row['antecedents'])
                    cons_codes = list(row['consequents'])

                    ante_descs = [desc_lookup.get(c, c) for c in ante_codes]
                    cons_descs = [desc_lookup.get(c, c) for c in cons_codes]

                    rules_list.append({
                        "rule_id": idx + 1,
                        "antecedents": ante_codes,
                        "antecedents_names": ante_descs,
                        "consequents": cons_codes,
                        "consequents_names": cons_descs,
                        "antecedent_str": ", ".join(ante_codes),
                        "consequent_str": ", ".join(cons_codes),
                        "rule_string": f"{{{', '.join(ante_codes)}}} -> {{{', '.join(cons_codes)}}}",
                        "rule_string_names": f"{{{', '.join(ante_descs)}}} -> {{{', '.join(cons_descs)}}}",
                        "support": round(float(row['support']), 4),
                        "confidence": round(float(row['confidence']), 4),
                        "lift": round(float(row['lift']), 4),
                        "leverage": round(float(row.get('leverage', 0.0)), 4),
                        "conviction": round(float(row['conviction']), 4) if not np.isinf(row.get('conviction', 1.0)) else 999.0
                    })

        # Format frequent itemsets for display
        itemsets_formatted = []
        for idx, row in frequent_itemsets.sort_values(by='support', ascending=False).head(40).iterrows():
            items = list(row['itemsets'])
            itemsets_formatted.append({
                "itemset": items,
                "itemset_names": [desc_lookup.get(i, i) for i in items],
                "itemset_str": ", ".join(items),
                "support": round(float(row['support']), 4),
                "item_count": len(items)
            })

        return {
            "algorithm": "Apriori Association Rule Mining",
            "total_transactions": total_transactions,
            "min_support_used": round(effective_support, 4),
            "min_confidence_used": round(min_confidence, 4),
            "frequent_itemsets_count": len(frequent_itemsets),
            "association_rules_count": len(rules_list),
            "frequent_itemsets": itemsets_formatted,
            "association_rules": rules_list[:100],  # Return up to top 100 rules
            "viva_explanation": {
                "support": "Frequency of itemset in the dataset: P(A ∩ B)",
                "confidence": "Likelihood that B is purchased given A is purchased: P(B | A) = Support(A ∩ B) / Support(A)",
                "lift": "Ratio of observed support to expected support if A and B were independent: Confidence(A -> B) / Support(B). Lift > 1 indicates strong positive association."
            }
        }
