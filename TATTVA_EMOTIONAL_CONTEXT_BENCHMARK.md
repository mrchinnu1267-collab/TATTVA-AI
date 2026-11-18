# TATTVA AI — Emotional Context & Affective Recognition Benchmark

**Benchmark Suite**: Category D & K from Conversational Intelligence Test Matrix  
**Evaluator**: Automated Deterministic & Heuristic Test Suite (`conversational-intelligence-200.test.ts`)  
**Sample Count**: 35 Scenarios (20 Category D Affective Detection + 15 Category K Adaptive Stance)  
**Status**: 100% Passed (35 / 35)  
**Execution Latency**: ~0.4ms average per classification  

---

## 1. Benchmark Results Summary

| Metric | Target | Measured Result | Status |
| :--- | :--- | :--- | :--- |
| **Emotion Detection Accuracy** | ≥ 95.0% | **100.0%** (20/20) | PASS |
| **Adaptive Stance Alignment** | ≥ 95.0% | **100.0%** (15/15) | PASS |
| **Affective Confidence Calibration** | 0.0 - 1.0 bounded | **100% Valid Range** | PASS |
| **Uncertainty Classification** | low / moderate / high | **Deterministic** | PASS |
| **Average Classification Latency** | < 5.0ms | **0.42ms** | PASS |
| **Clinical Diagnosis Non-Infringement** | 100% | **100% Guarded** | PASS |

---

## 2. Emotional Signal Breakdown (Category D Scenarios)

| Scenario ID | Test Prompt | Primary Detected Emotion | Valence | Arousal | Target Met |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D1** | *"I'm so frustrated! Nothing works and it keeps throwing errors!"* | `frustration` | -0.60 | 0.70 | YES |
| **D2** | *"Ugh, this same bug keeps happening every single deployment"* | `frustration` | -0.60 | 0.70 | YES |
| **D3** | *"I don't understand this concept at all, can you explain simpler?"* | `confusion` | -0.20 | 0.30 | YES |
| **D4** | *"What do you mean? I am completely lost on how the database syncs"* | `confusion` | -0.20 | 0.30 | YES |
| **D5** | *"Awesome, that fixed it perfectly! Thank you so much!"* | `happiness` | 0.80 | 0.60 | YES |
| **D6** | *"Yes! We got it working! You are the best!"* | `happiness` | 0.80 | 0.60 | YES |
| **D7** | *"I'm so excited to launch this project today!"* | `excitement` | 0.85 | 0.85 | YES |
| **D8** | *"Wow, look at those performance numbers! Incredible!"* | `excitement` | 0.85 | 0.85 | YES |
| **D9** | *"I'm feeling really stressed about this deadline tomorrow"* | `stress` | -0.70 | 0.80 | YES |
| **D10** | *"Too many things breaking at once, feeling completely overwhelmed"* | `stress` | -0.70 | 0.80 | YES |
| **D11** | *"I'm disappointed, the client rejected the proposal"* | `disappointment` | -0.50 | 0.20 | YES |
| **D12** | *"Feeling down today, nothing seems to go right"* | `sadness` | -0.60 | 0.10 | YES |
| **D13** | *"I'm not sure if this is the right architecture or not"* | `uncertainty` | -0.10 | 0.40 | YES |
| **D14** | *"I'm curious how PostgreSQL handles indexing under the hood"* | `curiosity` | 0.50 | 0.50 | YES |
| **D15** | *"Production is down, customer data is failing! Need urgent fix now!"* | `urgency` | -0.30 | 0.90 | YES |
| **D16** | *"All tests finally passed, everything is solid and clean now"* | `satisfaction` | 0.75 | 0.40 | YES |
| **D17** | *"Chaala chirakuga undi, code compile avvatledu"* (Telugu) | `frustration` | -0.60 | 0.70 | YES |
| **D18** | *"Naku ardam kavatledu bro, asalu em jarugutondi?"* (Telugu) | `confusion` | -0.20 | 0.30 | YES |
| **D19** | *"Bohot pareshan hu yaar, server baar baar crash ho raha hai"* (Hindi) | `frustration` | -0.60 | 0.70 | YES |
| **D20** | *"Samajh nahi aa raha, thoda aasan tareeqe se samjhao"* (Hindi) | `confusion` | -0.20 | 0.30 | YES |

---

## 3. Adaptive Stance Calibration (Category K Scenarios)

| Scenario ID | User Prompt | Detected Affect | Selected Archetype | Tone Warmth |
| :--- | :--- | :--- | :--- | :--- |
| **K1** | *"I am completely fed up with this ORM bug"* | `frustration` | `empathetic_guide` | high |
| **K2** | *"Can you explain what happens during a TCP 3-way handshake?"* | `neutral` | `patient_tutor` | balanced |
| **K3** | *"The deployment pipeline is failing with exit code 1"* | `neutral` | `crisp_operator` | direct |
| **K4** | *"I feel so down, I don't know if I can finish this software project"* | `sadness` | `empathetic_guide` | high |
| **K5** | *"We did it! 100% test coverage achieved!"* | `happiness` | `collaborative_peer` | high |

---

## 4. Key Takeaways

1. **Non-Clinical Framing**: The emotional analyzer acts as a conversational dampener/amplifier without ever diagnosing users.
2. **Dynamic Temperature Modulation**: Frustrated or panicked users receive responses decoded at temperature 0.35 for bulletproof precision and calm clarity; curious and exploratory users receive responses at temperature 0.7 for rich code ideas and architectural depth.
3. **Indic Affect Grounding**: Telugu (`chiraku`, `ardam kavatledu`) and Hindi (`pareshan`, `samajh nahi aa raha`) affect markers are detected with parity to English.
