# Práctica Entregable: Diseño de Aplicaciones en la Nube

## AP1: Diseño de aplicaciones básicas en la nube

### Objetivo
Diseñar y desplegar una aplicación robusta y escalable utilizando servicios fundamentales de AWS.

---

### 1.1. Base de datos, balanceo y escalado
Se hará uso de servicios de base de datos gestionados por AWS, enseñando en la defensa que se conocen las condiciones dinámicas para un despliegue resiliente (sin implementar pues aumentan significativamente el coste).

### 1.2. Computación y despliegue en la nube
Se realizará el despliegue de la aplicación utilizando máquinas virtuales y/o contenedores en el servicio de computación de AWS, desarrollando utilidades para lanzar y terminar instancias.

### 1.3. Desacoplamiento
Se diseñará la aplicación de forma que sus componentes estén desacoplados, comunicándose entre sí a través de servicios de colas y/o bases de datos, para mejorar la escalabilidad y mantenibilidad.

---

## Requisitos Técnicos

**Base de datos:**  
Tabla/s en RDS/DynamoDB para almacenar elementos con al menos 3 atributos.

### Operaciones CRUD obligatorias
- **Create:** Crear un nuevo elemento  
- **Read:** Obtener un elemento por ID  
- **Read All:** Obtener todos los elementos (puede usarse la misma lambda que para el anterior para ahorrar huecos aunque normalmente no es recomendable)  
- **Update:** Actualizar un elemento existente  
- **Delete:** Eliminar un elemento

### Endpoints HTTP (ejemplo)
```
POST /items        - Crear elemento
GET /items/{id}    - Obtener por ID
GET /items         - Obtener todos
PUT /items/{id}    - Actualizar elemento
DELETE /items/{id} - Eliminar elemento
```

---

## Arquitectura recomendada
- **Versión no desacoplada:** EC2 (o ECS si se usa Docker)  
- **Versión desacoplada:** Lambdas (máximo 7 funciones incluidas las ya presentes que NO SE PUEDEN ELIMINAR)  
- **API Gateway:** Obligatorio para ocultar los servicios en ambos casos  

> Se recomienda haber recibido la clase del **29/09/2025** sobre APIs para el diseño del YAML y la aplicación en general.

---

## Entregables y Evaluación

### 1. Entrega Base (5 puntos)
- Código de la aplicación  
- YAML con los recursos AWS  
- Explicación mínima de cómo hacerlo funcionar  
- Pricing de la solución con justificación para 1 mes y 1 año de funcionamiento  
- Colecciones tipo Postman o herramienta rudimentaria de prueba de la API  

### 2. Puntuación Adicional
- **+3 puntos:** El despliegue de recursos YAML pone el código ya a funcionar  
- **+1 punto:** La API genera documentación de forma automática  
- **+1 punto:** Se prepara alguna interfaz rudimentaria de prueba que permita probar todas las funciones de CRUD  

**Total máximo:** 10 puntos


En esta entrega han de incluirse los siguientes elementos:

- Memoria de la práctica
- Código asociado a la entrega
- Ficheros yaml si los hubiera
- Costo del despliegue durante 1 mes y 1 año (puede ir incluido en la memoria)
- Esquema de la/s arquitectura/s desplegadas