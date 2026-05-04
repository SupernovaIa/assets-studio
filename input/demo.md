# Observabilidad en Microservicios

## Por qué observabilidad

Monitorizar no es lo mismo que observar. La monitorización te dice si algo está roto; la observabilidad te dice por qué. En arquitecturas de microservicios, donde una petición atraviesa 5-10 servicios, necesitas los tres pilares: logs, métricas y trazas.

Sin observabilidad, depurar un problema en producción es como buscar una aguja en un pajar distribuido.

> "Observability is not about collecting data. It's about being able to ask new questions of your system without deploying new code." — Charity Majors, CTO de Honeycomb

## Los tres pilares

### Logs estructurados

Los logs son el pilar más básico. Pero logs de texto plano no escalan — necesitas logs estructurados en JSON con campos consistentes.

Campos obligatorios en cada log:
- `timestamp` en ISO 8601
- `service` nombre del microservicio
- `traceId` para correlacionar con trazas
- `level` (debug, info, warn, error)
- `message` descripción legible

```javascript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: 'payment-api', version: '2.3.1' },
});

logger.info({ traceId, userId, amount }, 'Payment processed');
```

Buenas prácticas:
- Usar log levels correctamente: debug para desarrollo, info para flujo normal, warn para situaciones recuperables, error solo para fallos reales
- No logear datos sensibles (tokens, contraseñas, tarjetas)
- Incluir siempre contexto de negocio, no solo técnico

Malas prácticas:
- console.log en producción
- Logs sin estructura ni timestamp
- Logear el request body completo (GDPR, rendimiento)

### Métricas

Las métricas son datos numéricos agregados en el tiempo. Son baratas de almacenar y perfectas para dashboards y alertas.

Tipos de métricas:
- Counter: solo sube (requests totales, errores acumulados)
- Gauge: sube y baja (memoria usada, conexiones activas)
- Histogram: distribuciones (latencia p50, p95, p99)

Las cuatro señales doradas de Google SRE:
- Latencia: tiempo de respuesta (p50: 45ms, p95: 120ms, p99: 340ms)
- Tráfico: peticiones por segundo (actual: 2,400 req/s)
- Errores: tasa de fallos (objetivo: <0.1%, actual: 0.04%)
- Saturación: uso de recursos (CPU: 62%, memoria: 78%, disco: 45%)

Adopción de herramientas de métricas en la industria (2024):
- Prometheus: 78%
- Datadog: 65%
- Grafana: 71%
- CloudWatch: 52%
- New Relic: 38%

```javascript
const histogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

app.use((req, res, next) => {
  const end = histogram.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path, status: res.statusCode });
  });
  next();
});
```

### Trazas distribuidas

Una traza es el recorrido completo de una petición a través de todos los servicios. Cada servicio genera un "span" con inicio, fin y metadatos. OpenTelemetry es el estándar.

Componentes de una traza:
1. El cliente envía una petición al API Gateway
2. El gateway genera un traceId único y lo propaga
3. Cada servicio crea un span hijo con su operación
4. Los spans se envían al collector (Jaeger, Zipkin, Tempo)
5. El collector reconstruye la traza completa

```javascript
const { trace } = require('@opentelemetry/api');

async function processOrder(orderId) {
  const span = trace.getActiveSpan();
  span.setAttribute('order.id', orderId);

  const items = await getOrderItems(orderId);
  span.setAttribute('order.items', items.length);

  const total = await calculateTotal(items);
  span.addEvent('total_calculated', { total });

  return await chargePayment(total);
}
```

## Implementación práctica

### Stack recomendado

Para equipos que empiezan, este es el stack con mejor relación coste/complejidad:

| Pilar | Herramienta | Alternativa | Coste |
|-------|-------------|-------------|-------|
| Logs | Loki + Grafana | ELK Stack | Bajo |
| Métricas | Prometheus + Grafana | Datadog | Bajo |
| Trazas | Tempo + Grafana | Jaeger | Bajo |
| Instrumentación | OpenTelemetry | Vendor SDK | Gratis |

Madurez de observabilidad por fase de empresa:
- Startup (1-5 devs): logs básicos + uptime check — cobertura ~30%
- Scale-up (5-20 devs): métricas + alertas + dashboards — cobertura ~60%
- Empresa (20+ devs): trazas distribuidas + SLOs + correlación automática — cobertura ~85%

### Alertas que funcionan

El 80% de las alertas en la mayoría de equipos son ruido. Una buena alerta tiene:
- Umbral basado en SLO, no en valores arbitrarios
- Ventana de tiempo suficiente (5 min, no instantánea)
- Runbook enlazado con pasos concretos
- Escalado automático si no se ack en 15 min

Distribución típica de alertas por severidad:
- Critical (página a oncall): 5%
- Warning (revisar en horario): 25%
- Info (solo dashboard): 70%
