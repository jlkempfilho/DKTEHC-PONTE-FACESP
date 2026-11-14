# Infra com Terraform

Sobe o atendimento da associação inteiro em Docker: banco (pgvector), LLM (Ollama, GPU), transcrição (Whisper, GPU) e a aplicação, numa rede própria, com portas só em 127.0.0.1.

Pré-requisitos: Docker Desktop com GPU NVIDIA, Terraform 1.6+, `.env` na raiz do repositório (a partir de `.env.example`) e a pasta da voz (`kokoro-v1.0.onnx` e `voices-v1.0.bin`).

```bash
cd infra
docker compose -f ../docker-compose.yml down   # libera portas e nomes; os volumes (dados) ficam
terraform init
terraform apply                                # máquina que já tem a base
terraform apply -var carregar_base=true        # máquina nova: catálogo, coleta, embeddings, léxico (demora)
```

- Atendimento: http://127.0.0.1:8090 · Painel do curador: http://127.0.0.1:8090/admin (`ADMIN_TOKEN` do `.env`)
- Linux/Mac: `-var docker_host=unix:///var/run/docker.sock`. Outra pasta da voz: `-var kokoro_dir=...`
- Os volumes padrão são os do compose: o Terraform reaproveita a base que já existe. O volume do banco tem `prevent_destroy`.
- O `.env` entra no container por volume somente leitura e nunca vai para a imagem.

Banco criado antes das migrações 80, 90, 95 e 96: os scripts de `db/init` só rodam em volume vazio. Aplique os que faltarem com `psql` (ver histórico de 14/11).
