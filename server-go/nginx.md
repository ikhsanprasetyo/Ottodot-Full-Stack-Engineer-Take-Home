# Nginx Server Configuration Guide (Zero Downtime Production)

Gunakan konfigurasi berikut untuk menghubungkan Nginx ke Backend Go dengan **Zero Downtime Load Balancer** dan dukungan CORS/WebSocket.

## File Utama Nginx (`/www/server/panel/vhost/nginx/serverottodot.byteseeker.net.conf`)

Ganti atau sesuaikan konfigurasi server Anda di aaPanel menjadi seperti ini:

```nginx
# ========================================================
# UPSTREAM: Zero Downtime Load Balancer (Main + Standby)
# ========================================================
upstream ottodot_backend {
    server 127.0.0.1:9050 max_fails=2 fail_timeout=3s; # Main Server 1 (ottodot-server)
    server 127.0.0.1:9051 backup;                      # Standby Server 2 (ottodot-server-2)
}

server {
    listen 80;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    listen [::]:80;
    server_name serverottodot.byteseeker.net;
    
    # Root directory (folder binary Go)
    root /www/wwwroot/ottodot.byteseeker.net/server-go/bin;
    index index.html index.htm;

    # SSL Configuration
    ssl_certificate        /www/server/panel/vhost/cert/serverottodot.byteseeker.net/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/serverottodot.byteseeker.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_tickets on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000" always;
    error_page 497 https://$host$request_uri;

    # Force HTTPS Redirect
    if ($server_port !~ 443) {
        return 301 https://$host$request_uri;
    }

    # ========================================================
    # SERVE UPLOADS DIRECTLY (Eksplisit & Prioritas Tinggi)
    # ========================================================
    location ^~ /uploads/ {
        alias /www/wwwroot/ottodot.byteseeker.net/server-go/bin/uploads/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }

    # ========================================================
    # UTAMA: Proxy Pass ke Upstream Go Backend (Zero Downtime)
    # ========================================================
    location / {
        proxy_pass http://ottodot_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Required for Realtime Seat & Roster Broadcast)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Ensure OPTIONS method is passed to Go for CORS handling
        proxy_pass_request_headers on;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Forbidden files or directories
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md) {
        return 404;
    }

    # SSL verification directory
    location ~ \.well-known {
        allow all;
    }

    # Security: Prohibit sensitive files in certificate verification directory
    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    # Static files logging
    location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ {
        expires      30d;
        error_log /dev/null;
        access_log /dev/null;
    }

    location ~ .*\.(js|css)?$ {
        expires      12h;
        error_log /dev/null;
        access_log /dev/null; 
    }

    access_log  /www/wwwlogs/serverottodot.byteseeker.net.log;
    error_log  /www/wwwlogs/serverottodot.byteseeker.net.error.log;
}
```

## Analisis & Rekomendasi Poin Penting:
1. **Dukungan Zero Downtime Upstream (`upstream ottodot_backend`)**:
   - Menambahkan `upstream ottodot_backend` di atas blok `server`.
   - `127.0.0.1:9050` (Server 1 `ottodot-server`) dijadikan server utama.
   - `127.0.0.1:9051` (Server 2 `ottodot-server-2`) dijadikan `backup`.
   - Ketika `ottodot-server` di-restart saat deploy script berjalan, Nginx **secara instan mengalihkan traffic ke Port 9051** tanpa ada jeda mati (0% error 502/503 bagi user).
2. **Force HTTPS Redirect**:
   - Menambahkan `if ($server_port !~ 443) { return 301 https://$host$request_uri; }` untuk memastikan pengalihan HTTPS berjalan sempurna.
3. **Pengiriman Header CORS & WebSocket**:
   - Memastikan `Upgrade` dan `Connection "upgrade"` dipertahankan untuk fitur WebSocket Realtime.
