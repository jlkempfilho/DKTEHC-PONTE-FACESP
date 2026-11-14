variable "docker_host" {
  description = "Windows: npipe:////./pipe/docker_engine · Linux/Mac: unix:///var/run/docker.sock"
  default     = "npipe:////./pipe/docker_engine"
}
variable "prefixo" { default = "facesp" }
variable "volume_pgdata" { default = "hackathon_pgdata" }
variable "volume_modelos" { default = "hackathon_modelos" }
variable "volume_stt" { default = "hackathon_stt" }
variable "modelo_llm" { default = "qwen2.5:7b-instruct" }
variable "carregar_base" {
  description = "true numa máquina nova: roda catálogo, coleta, embeddings e léxico (demora)"
  type        = bool
  default     = true
}
