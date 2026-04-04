# WombDAO 🧬

> Decentralized Research & Funding Platform for Ectogenesis Science

**Twitter:** [@womb_dao](https://twitter.com/womb_dao)  
**Chain:** Base  
**Token:** $WOMB

## Overview
WombDAO is a DAO for funding and advancing ectogenesis research. Our AI agent manages simulation pipelines, analyzes real RNA sequencing data, and proposes improvements voted on by token holders.

## Structure
- `extension/` — Chrome Extension (AI assistant + Base wallet integration)
- `landing-page/` — Marketing site
- `contracts/` — Solidity smart contracts (Base)

## Setup
1. Copy `.env.example` to `.env` and fill in your values
2. Never commit `.env` to git

## Tech Stack
- Chrome Extension (Manifest V3, vanilla JS)
- OpenRouter API (free AI models)
- Base chain (EVM)
- IPFS/Pinata (research data storage)
- NCBI/GEO (real biomedical datasets)
