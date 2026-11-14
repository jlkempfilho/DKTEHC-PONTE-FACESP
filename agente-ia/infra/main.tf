# Assistente das associações comerciais (Hackathon Connect 7.0, desafio FACESP) em Docker: banco (pgvector), LLM (Ollama), transcrição (Whisper) e a aplicação.
# Mesmo desenho do docker-compose.yml, com a aplicação também em container. Portas só em 127.0.0.1.
terraform {
  required_providers {
    docker = { source = "kreuzwerker/docker", version = "~> 3.6" }
  }
}

provider "docker" {
  host = var.docker_host
}

locals {
  raiz = abspath("${path.module}/..")
  env  = { for l in split("\n", file("${local.raiz}/.env")) : trimspace(split("=", l)[0]) => trimspace(join("=", slice(split("=", l), 1, length(split("=", l))))) if length(split("=", l)) > 1 && !startswith(trimspace(l), "#") }
}

resource "docker_network" "rede" {
  name = "${var.prefixo}-rede"
}

# Os nomes padrão são os do compose: reaproveita os dados que já existem na máquina.
resource "docker_volume" "pgdata" {
  name = var.volume_pgdata
  lifecycle {
    prevent_destroy = true     # banco com a base coletada: destroy não apaga
    ignore_changes  = [labels] # volume criado pelo compose tem etiquetas dele; sem isso o Terraform recriaria (apagaria) o volume
  }
}
resource "docker_volume" "modelos" {
  name = var.volume_modelos
  lifecycle {
    prevent_destroy = true # volume compartilhado com outros projetos (modelos baixados)
    ignore_changes  = [labels]
  }
}
resource "docker_volume" "stt_cache" {
  name = var.volume_stt
  lifecycle {
    prevent_destroy = true # volume compartilhado com outros projetos (modelos baixados)
    ignore_changes  = [labels]
  }
}

resource "docker_image" "db" { name = "pgvector/pgvector:0.8.0-pg17" }
resource "docker_image" "llm" { name = "ollama/ollama:0.12.6" }
resource "docker_image" "stt" { name = "onerahmet/openai-whisper-asr-webservice:v1.10.0-gpu" }
# Build pelo CLI do Docker: o build do provider estourava o prazo da API no Docker Desktop.
resource "terraform_data" "app_imagem" {
  triggers_replace = [sha1(join("", concat([for f in sort(fileset(local.raiz, "{app,web,db,scripts,docs,carga}/**")) : filesha1("${local.raiz}/${f}")], [filesha1("${local.raiz}/requirements.txt"), filesha1("${local.raiz}/Dockerfile")])))]
  provisioner "local-exec" {
    command = "docker build -q -t ${var.prefixo}-app:local ${local.raiz}"
  }
}

resource "docker_container" "db" {
  name     = "${var.prefixo}-db"
  image    = docker_image.db.image_id
  restart  = "unless-stopped"
  shm_size = 4096 # HNSW paralelo estoura os 64 MB padrão
  env = [
    "POSTGRES_DB=hackathon",
    "POSTGRES_USER=${local.env["PG_SUPERUSER"]}",
    "POSTGRES_PASSWORD=${local.env["PG_SUPERUSER_PASSWORD"]}",
    "APP_MOTOR_PASSWORD=${local.env["APP_MOTOR_PASSWORD"]}",
    "APP_ADMIN_PASSWORD=${local.env["APP_ADMIN_PASSWORD"]}",
    "APP_AVALIADOR_PASSWORD=${local.env["APP_AVALIADOR_PASSWORD"]}",
    "APP_ATENDENTE_PASSWORD=${local.env["APP_ATENDENTE_PASSWORD"]}",
  ]
  command = ["postgres", "-c", "shared_preload_libraries=pg_stat_statements", "-c", "password_encryption=scram-sha-256", "-c", "log_min_duration_statement=500"]
  ports {
    internal = 5432
    external = 54329
    ip       = "127.0.0.1"
  }
  volumes {
    volume_name    = docker_volume.pgdata.name
    container_path = "/var/lib/postgresql/data"
  }
  volumes {
    host_path      = "${local.raiz}/db/init"
    container_path = "/docker-entrypoint-initdb.d"
    read_only      = true
  }
  networks_advanced {
    name    = docker_network.rede.id
    aliases = ["db"]
  }
  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d hackathon"]
    interval = "5s"
    retries  = 20
  }
  wait = true
}

resource "docker_container" "llm" {
  name    = "${var.prefixo}-llm"
  image   = docker_image.llm.image_id
  restart = "unless-stopped"
  gpus    = "all"
  env = [
    "OLLAMA_KEEP_ALIVE=24h",       # modelo frio derrubava a 1a pergunta da demo
    "OLLAMA_NUM_PARALLEL=1",       # 8 GB de VRAM
    "OLLAMA_MAX_LOADED_MODELS=2",  # LLM e embeddings juntos
    "OLLAMA_FLASH_ATTENTION=1",
  ]
  ports {
    internal = 11434
    external = 11435
    ip       = "127.0.0.1"
  }
  volumes {
    volume_name    = docker_volume.modelos.name
    container_path = "/root/.ollama"
  }
  networks_advanced {
    name    = docker_network.rede.id
    aliases = ["llm"]
  }
}

resource "docker_container" "stt" {
  name    = "${var.prefixo}-stt"
  image   = docker_image.stt.image_id
  restart = "unless-stopped"
  gpus    = "all"
  env     = ["ASR_ENGINE=faster_whisper", "ASR_MODEL=medium", "ASR_QUANTIZATION=int8", "ASR_MODEL_IDLE_TIMEOUT=300"]
  ports {
    internal = 9000
    external = 9000
    ip       = "127.0.0.1"
  }
  volumes {
    volume_name    = docker_volume.stt_cache.name
    container_path = "/root/.cache"
  }
  networks_advanced {
    name    = docker_network.rede.id
    aliases = ["stt"]
  }
}

# Modelos do Ollama: idempotente (pull de modelo já baixado só confere).
resource "terraform_data" "modelos" {
  triggers_replace = [docker_container.llm.id]
  provisioner "local-exec" {
    command = "docker exec ${docker_container.llm.name} ollama pull ${var.modelo_llm} && docker exec ${docker_container.llm.name} ollama pull bge-m3"
  }
}

resource "docker_container" "app" {
  name    = "${var.prefixo}-app"
  image   = "${var.prefixo}-app:local"
  restart = "unless-stopped"
  env = [ # sobrepõem o .env: dentro da rede os serviços têm nome, não 127.0.0.1
    "PG_HOST=db",
    "PG_PORT=5432",
    "LLM_LOCAL_URL=http://llm:11434",
    "STT_URL=http://stt:9000",
  ]
  ports {
    internal = 8090
    external = 8090
    ip       = "127.0.0.1"
  }
  volumes {
    host_path      = "${local.raiz}/.env"
    container_path = "/app/.env"
    read_only      = true
  }
  networks_advanced {
    name = docker_network.rede.id
  }
  depends_on = [docker_container.db, terraform_data.modelos, docker_container.stt, terraform_data.app_imagem]
  lifecycle { replace_triggered_by = [terraform_data.app_imagem] } # imagem nova = container novo
}

# Base vazia (máquina nova): carga completa, igual ao scripts/reconstruir.sh. Ligar com -var carregar_base=true.
resource "terraform_data" "carga" {
  count            = var.carregar_base ? 1 : 0
  triggers_replace = [docker_container.app.id]
  provisioner "local-exec" {
    command = join(" && ", [for f in ["carga_catalogo.py", "carga_rede.py", "embeddings.py", "lexico.py"] : "docker exec -w /app/app ${docker_container.app.name} python ${f}"]) # sem aspas aninhadas: o cmd do Windows quebrava
  }
}

output "atendimento" { value = "http://127.0.0.1:8090" }
output "painel_curador" { value = "http://127.0.0.1:8090/admin" }
