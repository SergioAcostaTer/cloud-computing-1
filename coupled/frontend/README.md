# 🪣 Bitcoin Front — Despliegue de Sitio Web Estático

Frontend estático para la aplicación **Bitcoin Positions**.

Esta guía explica cómo desplegar el sitio en **AWS S3** para acceso público.

---

## 🚀 Pasos de Despliegue

### 1️⃣ Crear el Bucket en S3

```bash
aws s3 mb s3://bitcoin-front --region us-east-1
```

### 2️⃣ Habilitar el Hosting Estático

```bash
aws s3 website s3://bitcoin-front/ --index-document index.html --error-document index.html
```

### 3️⃣ Permitir Acceso Público de Solo Lectura

```bash
aws s3api put-bucket-policy --bucket bitcoin-front --policy file://policy.json
```

> ⚙️ También desactiva la opción **Bloquear todo el acceso público** desde la consola de AWS S3.

### 4️⃣ Subir los Archivos

```bash
aws s3 sync . s3://bitcoin-front
```

### 5️⃣ Acceder al Sitio Web

```
http://bitcoin-front.s3-website-us-east-1.amazonaws.com
```

✅ ¡Listo! Tu frontend estático ya está en línea en S3.

---

## 💰 Coste Estimado de Hosting

El costo de mantener un sitio estático en **Amazon S3** es extremadamente bajo, ya que solo se cobra por el **almacenamiento** y el **tráfico de salida**.

| Duración | Almacenamiento (50 MB) | Transferencia (1 GB/mes) | Total Aproximado |
| -------- | ---------------------- | ------------------------ | ---------------- |
| 1 mes    | USD $0.03              | USD $0.09                | **USD $0.12**    |
| 1 año    | USD $0.36              | USD $1.08                | **USD $1.44**    |

> 💡 Los precios pueden variar ligeramente según la región y el uso real. Estos cálculos se basan en la región **us-east-1** (Norte de Virginia) con las tarifas estándar de AWS S3 en 2025.
