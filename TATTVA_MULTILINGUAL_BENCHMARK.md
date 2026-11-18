# TATTVA AI — Multilingual Intelligence Benchmark (Telugu & Hindi)

**Benchmark Suite**: Category F (15 Scenarios) & Category H (15 Informal/Code-Mixed Scenarios)  
**Evaluator**: `tests/conversational-intelligence-200.test.ts` (Vitest Suite)  
**Date**: November 2026  
**Status**: 100% Passed (30 / 30 Scenarios)  

---

## 1. Executive Summary

TATTVA AI provides native support for Telugu (తెలుగు), Hindi (हिन्दी), and their ubiquitous Romanized colloquial counterparts: **Tenglish** and **Hinglish**. Rather than forcing users into formal scripts or purely English prompts, the multilingual conversational engine detects colloquial patterns, normalizes tech-slang, and preserves conversational context across code-switches.

---

## 2. Test Matrix & Evaluation Results

### 2.1 Telugu & Tenglish Evaluation (Category F)

| Scenario ID | Test Prompt | Dialect / Script | Intent Extracted | Context Preserved | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F1** | *"నమస్కారం, మీరు నాకు సహాయం చేయగలరా?"* | Telugu Script | Greeting / Help | YES | **PASS** |
| **F2** | *"నమస్తే, ఈరోజు వాతావరణం ఎలా ఉంది?"* | Telugu Script | Weather Query | YES | **PASS** |
| **F3** | *"Next.js లో routing ఎలా చేయాలి?"* | Telugu Mixed | Routing Guide | YES | **PASS** |
| **F4** | *"ఈ ఎర్రర్ ఎందుకు వస్తోంది? పరిష్కారం చెప్పండి"* | Telugu Script | Debugging | YES | **PASS** |
| **F5** | *"నాకు పైథాన్ లో డేటాబేస్ కనెక్షన్ కోడ్ కావాలి"* | Telugu Script | Database Code | YES | **PASS** |
| **F6** | *"Naku Next.js lo server actions ela rayalo cheppandi"* | Romanized Tenglish | Server Actions | YES | **PASS** |
| **F7** | *"Ee bug fix cheyadam lo konchem help cheyandi"* | Romanized Tenglish | Bug Fix Request | YES | **PASS** |
| **F8** | *"Code execute avvatledu bro, em cheyali?"* | Romanized Tenglish | Runtime Failure | YES | **PASS** |
| **F9** | *"Supabase authentication setup cheyadaniki steps cheppava"* | Romanized Tenglish | Auth Setup | YES | **PASS** |
| **F10** | *"Telugu lo explain cheyandi please"* | Tenglish Directive | Language Switch | YES | **PASS** |

### 2.2 Hindi & Hinglish Evaluation (Category F)

| Scenario ID | Test Prompt | Dialect / Script | Intent Extracted | Context Preserved | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F11** | *"नमस्ते, आप मेरी क्या मदद कर सकते हैं?"* | Hindi Script | Greeting / Help | YES | **PASS** |
| **F12** | *"Mujhe Next.js mein routing kaise karni hai batao"* | Romanized Hinglish | Routing Guide | YES | **PASS** |
| **F13** | *"Yeh code execute nahi ho raha hai, error solve karo"* | Romanized Hinglish | Error Debug | YES | **PASS** |
| **F14** | *"Database connection kaise setup karein?"* | Romanized Hinglish | DB Setup | YES | **PASS** |
| **F15** | *"Hindi mein samjhaiye please"* | Hinglish Directive | Language Switch | YES | **PASS** |

---

## 3. Code-Mixing & Slang Normalization (Category H)

TATTVA AI normalizes informal internet slang and shorthand without losing user voice or intent:

| Input Text | Detected Dialect | Normalized Semantic Form | Intent Preserved |
| :--- | :--- | :--- | :--- |
| `"pls fix this code asap"` | English Informal | `"please fix this code immediately"` | YES |
| `"thx a lot bro"` | English Informal | `"thanks a lot brother"` | YES |
| `"idk what went wrong"` | English Informal | `"i do not know what went wrong"` | YES |
| `"rn the server is crashing"` | English Informal | `"right now the server is crashing"` | YES |
| `"tbh i am lost here"` | English Informal | `"to be honest i am lost here"` | YES |
| `"plz send the steps tmrw"` | English Informal | `"please send the steps tomorrow"` | YES |
| `"bcoz of syntax error it fails"` | English Informal | `"because of syntax error it fails"` | YES |
| `"FastAPI lo CORS ela pettali pls"` | Tenglish Hybrid | `"FastAPI lo CORS ela pettali please"` | YES |
| `"server down ho gaya rn"` | Hinglish Hybrid | `"server down ho gaya right now"` | YES |

---

## 4. Multi-Turn Code-Switching Resilience

In multi-turn testing, users frequently switch between English and their regional dialect:
1. **Turn 1 (English)**: *"Can you write a PostgreSQL schema for an e-commerce store?"*
2. **Turn 2 (Tenglish)**: *"Deentlo payments table kuda add cheyandi"* (Add payments table to this).
3. **Engine Behavior**:
   - `conversationalContextTracker` successfully preserves `PostgreSQL schema` as `currentTopic`.
   - The anaphoric marker `Deentlo` (In this) resolves directly to the schema generated in Turn 1.
   - Generates the `payments` table with foreign key `REFERENCES orders(id)` without asking what "this" refers to.
