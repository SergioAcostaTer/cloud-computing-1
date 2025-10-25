# 🧭 MEMORIA DE LA PRÁCTICA AWS — Coupled vs Decoupled Architecture
**Autor:**  
**Región de despliegue:** `us-east-1 (N. Virginia)`  
**Fecha:** Octubre 2025  

---

## 🧱 1. Descripción General

El objetivo de la práctica es diseñar, implementar y desplegar dos versiones funcionales de una misma API basada en AWS, que permita la gestión de posiciones financieras (CRUD completo).  
Cada arquitectura sigue un enfoque diferente:

- **Arquitectura Coupled (acoplada):** API monolítica contenedorizada ejecutándose en ECS Fargate, con integración directa a DynamoDB y exposición mediante API Gateway.
- **Arquitectura Decoupled (desacoplada):** API basada en microservicios implementados como funciones Lambda individuales, gestionadas y orquestadas por API Gateway, con DynamoDB como capa de persistencia común.

Ambas soluciones exponen una documentación dinámica OpenAPI/Swagger y comparten un frontend estático en S3 que interactúa con la API y visualiza las operaciones CRUD junto con datos de mercado en tiempo real.

---

## 🏗️ 2. Arquitecturas Desplegadas

### 🧩 Arquitectura Coupled (ECS Fargate + API Gateway + DynamoDB)

**Componentes principales:**
- **Amazon ECS Fargate:** Ejecución del contenedor Docker (Express.js + Swagger + AWS SDK).
- **API Gateway (REST):** Puerta de entrada HTTP, gestiona rutas, CORS y clave de API.
- **AWS DynamoDB:** Base de datos NoSQL para las posiciones (`id`, `symbol`, `side`, `amount`, `price`).
- **VPC Link:** Conexión privada entre API Gateway y el servicio ECS.
- **Amazon CloudWatch:** Logs centralizados para el contenedor y API Gateway.
- **Amazon S3:** Alojamiento del frontend estático y la documentación API.

📊 **Esquema de Arquitectura Coupled:**
> `![Arquitectura Coupled](./img/arquitectura_coupled.png)`

---

### ⚙️ Arquitectura Decoupled (Lambda + API Gateway + DynamoDB)

**Componentes principales:**
- **AWS Lambda:** Funciones independientes para cada endpoint CRUD y documentación.
- **API Gateway (REST):** Despachador centralizado que enruta las peticiones hacia las Lambdas.
- **AWS DynamoDB:** Base de datos compartida, misma estructura que en la arquitectura Coupled.
- **Amazon S3:** Alojamiento del frontend estático.
- **Amazon CloudWatch:** Logs y métricas para cada Lambda y API Gateway.

📊 **Esquema de Arquitectura Decoupled:**
> `![Arquitectura Decoupled](./img/arquitectura_decoupled.png)`

---

## 🧮 3. Estimación de Costes (Región us-east-1)

Los cálculos se realizan asumiendo **uso bajo de entorno educativo**, con unas **1000 peticiones diarias (~30.000/mes)** y almacenamiento pequeño (DynamoDB < 1 GB, logs limitados).

---

### 💼 3.1. Arquitectura Coupled (ECS Fargate)

| Recurso | Detalle / Supuesto | Costo aproximado mensual (USD) | Costo anual (USD) |
|----------|--------------------|-------------------------------:|------------------:|
| **ECS Fargate (1 servicio)** | 0.25 vCPU, 0.5 GB RAM, 24/7 | **$10.20** | **$122.40** |
| **API Gateway REST** | 30,000 requests × $3.50/millón | **$0.10** | **$1.20** |
| **DynamoDB** | 1 GB almacenamiento + 1M R/W ops | **$1.50** | **$18.00** |
| **CloudWatch Logs** | 1 GB logs/mes | **$0.50** | **$6.00** |
| **S3 (frontend)** | 1 GB almacenamiento + tráfico | **$0.30** | **$3.60** |
| **ECR (imagen Docker)** | 500 MB almacenado | **$0.05** | **$0.60** |

**💰 Total mensual (Coupled): ≈ $12.65 USD**  
**💰 Total anual (Coupled): ≈ $151.80 USD**

---

### ⚡ 3.2. Arquitectura Decoupled (Lambda)

| Recurso | Detalle / Supuesto | Costo aproximado mensual (USD) | Costo anual (USD) |
|----------|--------------------|-------------------------------:|------------------:|
| **AWS Lambda** | 7 funciones, 128 MB, 100 ms, 30k invocaciones | **$0.25** | **$3.00** |
| **API Gateway REST** | 30,000 requests × $3.50/millón | **$0.10** | **$1.20** |
| **DynamoDB** | 1 GB almacenamiento + 1M R/W ops | **$1.50** | **$18.00** |
| **CloudWatch Logs** | 1 GB logs/mes | **$0.50** | **$6.00** |
| **S3 (frontend)** | 1 GB almacenamiento + tráfico | **$0.30** | **$3.60** |

**💰 Total mensual (Decoupled): ≈ $2.65 USD**  
**💰 Total anual (Decoupled): ≈ $31.80 USD**

---

## 📈 4. Comparativa General

| Característica | Coupled (ECS) | Decoupled (Lambda) |
|-----------------|----------------|--------------------|
| **Escalabilidad** | Manual (tareas ECS) | Automática por invocación |
| **Costo base** | Alto (contendor 24/7) | Muy bajo (pago por uso) |
| **Cold Start** | No | Sí (poco perceptible en entorno educativo) |
| **Mantenimiento** | Requiere pipeline de imagen | Solo código Lambda |
| **Despliegue** | Makefile + CloudFormation ECS | Script PowerShell + SAM YAML |
| **Ideal para** | Carga continua o backend persistente | APIs event-driven y bajo consumo |

---

## 🧩 5. Conclusiones

- **La arquitectura Coupled** ofrece un entorno más cercano a una aplicación tradicional con un backend persistente y control total del entorno de ejecución. Sin embargo, su coste base es mayor al mantener el contenedor activo todo el tiempo.  
- **La arquitectura Decoupled**, basada en Lambda, es más económica, fácil de escalar y adecuada para entornos serverless, aunque introduce latencias mínimas y limitaciones en tiempos de ejecución y dependencias.
- Ambas arquitecturas cumplen los requisitos de **alta disponibilidad**, **escalabilidad**, **documentación accesible (Swagger)** y **frontend desacoplado y reusable**.
- En un contexto educativo o de bajo tráfico, **la versión Decoupled es claramente la opción más rentable y sencilla de mantener.**

---

## 📂 6. Elementos Incluidos

- Código fuente completo (ECS + Lambda)
- Ficheros YAML de despliegue
- Scripts de automatización (`Makefile`, `deploy.ps1`)
- Tests de API (`tests.http`)
- Estimación de costes (este documento)
- Esquemas de arquitecturas (a añadir por el autor)

---

✍️ **Fin de la memoria**
