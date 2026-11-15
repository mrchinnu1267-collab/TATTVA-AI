# TATTVA AI – PHASE 19: CUSTOM MODEL DEVELOPMENT

**Author**: kotapati Gowtham Chowdary  
**System**: TATTVA AI Indic SLM Architecture & Training System  
**Date**: November 15, 2026  
**Status**: Verified & Operational (26/26 Automated Tests Passing)

---

## 1. Executive Summary

Phase 19 establishes the complete engineering infrastructure for developing, fine-tuning, and serving **TATTVA Custom Small Language Models (SLMs)**. Focused on bilingual Indic fluency (Telugu, Hindi, and English), the framework automates instruction dataset curation in standard ChatML format, calculates exact VRAM requirements, configures optimal QLoRA hyperparameters (rank r=32/64, alpha=32/64), generates Unsloth training scripts, and catalogues model checkpoints in a centralized registry with serving specs for Ollama and vLLM.

---

## 2. Indic SLM Architecture & Fine-Tuning Specifications

| Parameter | TATTVA-SLM-1B | TATTVA-SLM-3B | TATTVA-SLM-7B |
|-----------|---------------|---------------|---------------|
| **Base Model** | Llama-3.2-1B-Instruct | Llama-3.2-3B-Instruct | Qwen2.5-7B-Instruct |
| **Quantization** | 4-bit NF4 | 4-bit NF4 | 4-bit NF4 |
| **LoRA Rank (r)** | 32 | 32 | 64 |
| **LoRA Alpha** | 32 | 32 | 64 |
| **Target Projections** | `q, k, v, o, gate, up, down` | `q, k, v, o, gate, up, down` | `q, k, v, o, gate, up, down` |
| **Sequence Length** | 4,096 tokens | 4,096 tokens | 4,096 tokens |
| **Estimated VRAM** | 6.5 GB (Consumer RTX 3060/4060) | 10.5 GB (RTX 4070/3080) | 18.0 GB (RTX 3090/4090/A10G) |
| **Primary Domain** | Edge / Mobile / Fast chat | Enterprise Indic Assistant | Deep reasoning & code generation |

---

## 3. Dataset Curation Pipeline

1. **ChatML Compliance**: Formats multi-turn dialogues with strict boundary delimiters (`<|im_start|>system...<|im_end|>`).
2. **Quality Scoring**: Enforces quality bounds (minimum 75/100), penalizing unhelpful refusals while rewarding code blocks and rich Indic vocabulary.
3. **Indic Script Preservation**: Detects and verifies Telugu (Unicode `\u0C00-\u0C7F`) and Devanagari Hindi (Unicode `\u0900-\u097F`) tokens.
4. **JSONL Serializer**: Emits SFT-ready training datasets compatible with Hugging Face `trl` and Unsloth.

---

## 4. Serving & Deployment Support

- **Ollama**: Generates `Modelfile` with ChatML template and calibrated system prompts.
- **vLLM**: Emits high-throughput OpenAI-compatible API launch commands with paged attention and GPU memory optimization.
- **Edge / On-Device**: Formats for GGUF Q4_K_M quantization and ONNX mobile runtimes.

---

## 5. Verification & Automated Tests

Automated test suite `frontend/tests/phase-19-custom-models.test.ts`:
- **Total Test Cases**: 26
- **Passed**: 26 (100%)
- **Test Scenarios**:
  - ChatML formatter validates system, user, and assistant turns with `<|im_start|>` and `<|im_end|>`.
  - Refusal and low-quality responses are automatically excluded.
  - LoRA configuration and VRAM estimation correctly scale between 1B, 3B, and 7B variants.
  - Unsloth Python script exporter generates valid 4-bit quantization directives.
  - Model registry tracks checkpoints and exports Ollama and vLLM launch configurations.
