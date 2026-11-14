# Hackathon Connect 7.0 - desafio FACESP

Atendimento das associações comerciais pelo WhatsApp: o lojista conta o que trava a loja e recebe uma solução de tecnologia já avaliada pela curadoria da associação (percurso 1). Quando nenhuma solução serve, a necessidade vira uma ficha de demanda, relatos parecidos de outras lojas se juntam e startups avaliam, pedem esclarecimento ou propõem um piloto (percurso 2).

**Tudo roda localmente**: modelo de linguagem, embeddings, transcrição de voz e banco. Soluções, empresas, links e preços do catálogo são fictícios.

## Como subir

Pré-requisitos: Docker Desktop com GPU NVIDIA, Terraform 1.6+ e `.env` a partir de `.env.example` (senhas fortes e chaves).

```bash
cd infra
terraform init
terraform apply      # banco, LLM, Whisper e aplicação; carrega catálogo, embeddings e léxico
```

- Lojista (chat): http://127.0.0.1:8090
- Startups (demandas): http://127.0.0.1:8090/startup
- Curadoria (catálogo e indicadores): http://127.0.0.1:8090/admin · fila de atendimento humano: http://127.0.0.1:8090/atendimento
- Teste de ponta a ponta dos dois percursos: `python scripts/teste_percursos.py`
- Catálogo fictício: `python carga/gerar_catalogo.py` gera `carga/catalogo.json`
- `DEMO_ABERTO=true` no `.env` abre curadoria, fila e tela da startup sem chave (só para demonstração; padrão fechado)

## Arquitetura

| Peça | O que faz |
|---|---|
| `app/motor.py` | Regras fixas antes do modelo (urgência, ataque, pedido de humano), busca híbrida no catálogo, resposta ancorada e verificador que corta empresa, preço ou link fora do catálogo |
| `app/demanda.py` | Percurso 2: completa a ficha de demanda na conversa (campos do guia), grava e agrupa relatos parecidos |
| `app/startup.py` | Tela da startup: demandas agrupadas sem identificar lojista; esclarecimento, adaptação ou piloto |
| `app/admin.py` | Painel da curadoria: catálogo versionado e auditado, vocabulário, indicadores |
| `app/whatsapp.py` | Canal WhatsApp (API Cloud da Meta) |
| `db/init/` | Esquema com papéis de menor privilégio: o atendimento grava a ficha mas não lê relato de outro lojista |
| `infra/` | Terraform: rede própria, portas só em 127.0.0.1, volumes do banco protegidos contra destroy |
