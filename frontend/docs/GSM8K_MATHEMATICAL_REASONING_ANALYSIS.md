# TATTVA AI — GSM8K Mathematical Performance & Reasoning Analysis

> **Lead Architect & Maintainer:** **kotapati Gowtham Chowdary**  
> **Module:** `MathTopicClassifier` (`app/lib/evaluation/gsm8k/math-topic-classifier.ts`)  
> **Objective:** Fine-grained error analysis, mathematical sub-domain taxonomy, and targeted model improvement recommendations.  

---

## 1. Mathematical Sub-Domain Taxonomy

TATTVA AI classifies GSM8K word problems into 7 core mathematical reasoning categories:

| Mathematical Topic | Defining Linguistic & Numerical Signatures | Average Frequency in GSM8K |
| :--- | :--- | :--- |
| **Arithmetic** | Basic addition, subtraction, simple multiplication, division | ~28% |
| **Multi-Step Word Problems** | Compound temporal sequencing, remainders, `"altogether"`, `"in total"` | ~32% |
| **Fractions** | Explicit fractions, `"half"`, `"third"`, `"quarter"`, fractional reduction | ~14% |
| **Percentages** | Discounts, sales tax, markups, interest rates, `%` | ~11% |
| **Ratios & Proportions** | Unit rates, `"per hour"`, `"per person"`, speed (mph), `"for every"` | ~9% |
| **Algebra & Variables** | Relative unknown quantities, `"twice as many"`, linear variables | ~4% |
| **Geometry & Dimensions** | Area, perimeter, rectangle, volume, dimensions | ~2% |

---

## 2. Common Mathematical Error Patterns in LLMs

During empirical testing, four recurring failure modes were identified in general LLM reasoning:

1. **Premature Rounding in Intermediate Steps**:
   - Models round fractional or decimal values before completing subsequent compounding multiplications, leading to off-by-one or off-by-several discrepancies.
   - *Mitigation*: Prompting Chain-of-Thought scratchpads to retain exact rational fractions until the final answer.
2. **Entity Misattribution in Multi-Step Chains**:
   - In 3-part word problems (e.g. Alice has $X$, Bob has $Y$, Charlie has half of both), models frequently attribute Bob's quantity to Alice.
   - *Mitigation*: Enforcing named variable declarations (`"Let Alice = 10, Bob = 20..."`).
3. **Unit Inversion in Rates & Ratios**:
   - Confusing speed vs time or price per unit vs total price.
   - *Mitigation*: Automated dimensional analysis tokens.
4. **Failure to Parse Negative Differences**:
   - Misinterpreting `"fewer than"` as an addition rather than a subtraction.

---

## 3. Automated Recommendations Engine

When sub-domain accuracy dips below the 60% threshold during evaluation runs, `MathTopicClassifier` automatically generates targeted training directives:
- **Fractions**: *"Enforce explicit cross-multiplication proofs and numerator/denominator reductions."*
- **Percentages**: *"Encourage step-by-step decimal conversion prior to applying discounts or markups."*
- **Multi-Step**: *"Implement intermediate variable scratchpads tracking quantities across sequential sentences."*
- **Algebra**: *"Guide model to formulate linear relationships ('Let x = ...') before solving."*
