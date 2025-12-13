# Sistema de Gestión de Beneficios - 3Montes Lucchetti

Sistema web para la gestión y entrega de beneficios a trabajadores de 3Montes Lucchetti (Grupo Nutresa). Incluye módulos para administración, recursos humanos, control de acceso mediante códigos QR, y portal de trabajadores.

## 🏗️ Estructura del Proyecto

```
3MontesSites/
├── index.html              # Página de login principal
├── css/                    # Hojas de estilo
│   ├── index.css
│   ├── admin.css
│   ├── guardia.css
│   ├── rrhh.css
│   ├── testing.css
│   ├── usuario.css
│   └── estilos.css
├── js/                     # Scripts JavaScript
│   ├── index.js           # Lógica de autenticación
│   ├── admin.js           # Gestión de trabajadores
│   ├── guardia.js         # Escaneo de QR
│   ├── rrhh.js            # Reportes de RRHH
│   ├── testing.js         # Ambiente de pruebas
│   ├── usuario.js         # Portal del trabajador
│   └── utils.js           # Funciones compartidas
├── pages/                  # Páginas internas
│   ├── admin.html
│   ├── guardia.html
│   ├── rrhh.html
│   ├── testing.html
│   └── usuario.html
├── assets/                 # Recursos estáticos
│   ├── logo.svg
│   ├── logo.png
│   └── iconos/
├── api/                    # Funciones serverless
│   └── gas.js             # API Gateway a Google Apps Script
└── .env.local             # Variables de entorno
```

## 🚀 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Google Apps Script (Supabase)
- **Deployment**: Vercel
- **Librerías**:
  - [SweetAlert2](https://sweetalert2.github.io/) - Alertas modernas
  - [html5-qrcode](https://github.com/mebjas/html5-qrcode) - Escaneo de códigos QR
  - [QRCode.js](https://davidshimjs.github.io/qrcodejs/) - Generación de códigos QR
  - [SheetJS](https://sheetjs.com/) - Exportación a Excel

## 📋 Requisitos Previos

- Node.js 18.x o superior
- npm 9.x o superior
- Cuenta de Vercel
- Cuenta de Supabase configurada

## ⚙️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/LloydHiggsBennison/Proyecto-Integrado
   cd Proyecto-Integrado
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env.local` en la raíz:
   ```env
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_ANON_KEY=tu_key_anonima
   ```

4. **Configurar Google Apps Script**
   
   Actualizar la URL del script en `api/gas.js`

## 🖥️ Ejecución Local

```bash
# Desarrollo con Vercel Dev
vercel dev

# La aplicación estará disponible en http://localhost:3000
```

## 👥 Roles de Usuario

### 🔐 Admin
- Gestión completa de trabajadores (CRUD)
- Exportación de datos a Excel
- Estadísticas generales y por sucursal
- Acceso completo al sistema

### 👮 Guardia
- Escaneo de códigos QR (trabajador + caja)
- Validación de entrega de beneficios
- Registro de entregas en tiempo real

### 📊 RRHH
- Visualización de trabajadores
- Reportes de beneficios entregados/pendientes
- Búsqueda y filtrado de personal

### 👤 Usuario/Trabajador
- Visualización de código QR personal
- Estado de beneficio
- Información de perfil

### 🧪 Testing
- Ambiente de pruebas con QR reutilizables
- Validación de flujo completo de escaneo
- QR de cajas de prueba

## 🔑 Credenciales de Acceso

Las credenciales se gestionan a través de la integración con Supabase. Los roles se asignan en la base de datos:

- `rol: 'admin'` - Acceso al panel de administración
- `rol: 'guardia'` - Acceso al módulo de control de acceso
- `rol: 'rrhh'` - Acceso al panel de recursos humanos
- `rol: 'testing'` - Acceso al ambiente de pruebas
- `rol: 'usuario'` - Acceso al portal del trabajador

## 📱 Funcionalidades Principales

### Gestión de Trabajadores
- Alta, baja y modificación de trabajadores
- Búsqueda y filtrado avanzado
- Exportación de datos a Excel
- Generación automática de códigos QR

### Control de Acceso
- Escaneo QR del trabajador
- Validación de vigencia del contrato
- Escaneo QR de la caja de beneficios
- Registro automático de entregas

### Sistema de Beneficios
- Asignación por tipo de contrato:
  - **Indefinido**: Caja grande
  - **Plazo Fijo**: Caja pequeña
- Validación automática de correspondencia
- Historial de entregas

### Seguridad
- Autenticación con hash de contraseñas
- Validación de roles
- Bloqueo de login tras múltiples intentos
- Sesiones basadas en localStorage

## 🌐 Deployment en Vercel

```bash
# Login en Vercel
vercel login

# Deploy a producción
vercel --prod
```

### Variables de Entorno en Vercel

Configurar en el dashboard de Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 🔧 Utilidades Disponibles

El archivo `js/utils.js` incluye:

- `formatearRUT(rut)` - Formatea RUT chileno
- `validarRUT(rut)` - Valida RUT chileno
- `formatearFecha(fecha)` - Formato DD/MM/YYYY
- `confirmar(titulo, texto)` - Diálogo de confirmación
- `mostrarExito(titulo, texto)` - Alerta de éxito
- `mostrarError(titulo, texto)` - Alerta de error
- `debounce(func, wait)` - Optimización de búsquedas

## 📝 Notas de Desarrollo

### Rutas Importantes

- **Login**: `/index.html`
- **Admin**: `/pages/admin.html`
- **Guardia**: `/pages/guardia.html`
- **RRHH**: `/pages/rrhh.html`
- **Usuario**: `/pages/usuario.html`
- **Testing**: `/pages/testing.html`

### API Endpoints

Todos los endpoints van a `/api/gas`:

- `?action=getUsers` - Obtener usuarios
- `?action=getNomina` - Obtener nómina
- `?action=getGuards` - Obtener guardias
- `?action=createUser` - Crear usuario
- `?action=getUserByEmail` - Obtener usuario por email

## 🐛 Solución de Problemas

### Error CORS en desarrollo local
Usar `vercel dev` en lugar de abrir archivos directamente con `file://`

### Error 404 al cerrar sesión
Verificar que las redirecciones usen rutas absolutas (`/index.html`)

### Códigos QR no se generan
Verificar que las librerías estén cargadas correctamente en el HTML

## 📄 Licencia

Proyecto desarrollado para 3Montes Lucchetti (Grupo Nutresa).

## 👨‍💻 Desarrollo

Desarrollado como Proyecto Integrado - 2025

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
