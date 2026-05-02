# Oracle Cloud Free Tier + Production

How to host the **word-gen server** on Oracle Cloud (Always Free VM) and attach it to your hosted UI, plus a short production checklist.

---

## 1. Oracle Cloud Free Tier — use the VM

Use **Oracle Cloud Free Tier → Compute → Create a VM instance** (the “VM” option, not serverless for this setup).

- **Always Free** gives you 1–2 AMD VMs or 4 ARM Ampere VMs (with limits). For the word-gen server + optional Ollama, one AMD VM (1 OCPU, 1 GB RAM) or one ARM VM (1 OCPU, 6 GB RAM) is enough; Ollama runs better on the ARM 6 GB shape.
- **Create VM:** Oracle Cloud Console → Compute → Instances → Create Instance. Choose an Always Free shape, pick a Linux image (e.g. Ubuntu 22), add your SSH public key, create. Note the **public IP**.
- **Open port for the API:**  
  - Networking → VCN → Security List for the VM’s subnet → Ingress Rules → Add: **Source** `0.0.0.0/0`, **Destination port** `3001` (or `80` if you put a reverse proxy in front). Save.
- **SSH in:** `ssh ubuntu@<public-ip>` (or the user your image uses).

---

## 2. On the Oracle VM: Node + word-gen server

On the VM (after SSH):

```bash
# Install Node 18+ (example for Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo (or upload the app)
git clone <your-repo-url> imposter-word-ai-game
cd imposter-word-ai-game

# Install dependencies
npm ci

# Create .env (copy from .env.example), set PORT=3001 and OLLAMA_BASE_URL if Ollama runs elsewhere
cp .env.example .env
# Edit .env: PORT=3001, OLLAMA_BASE_URL if needed

# Run word-gen server in background (install pm2 if you want it to survive logout)
sudo npm install -g pm2
pm2 start "npx tsx scripts/wordGenServer.ts" --name word-gen-server
pm2 save && pm2 startup
```

- **API base URL for your hosted UI:** `http://<public-ip>:3001` (or `https://<domain>` if you add a reverse proxy and TLS).
- **Attach to hosted UI:** In the place where you build the frontend (e.g. Vercel, Netlify, Firebase Hosting), set **`VITE_WORDGEN_API_URL=http://<public-ip>:3001`** (or your HTTPS URL), then rebuild and deploy. The hosted site will call this URL instead of localhost.

---

## 3. (Optional) Run Ollama on the same Oracle VM

If you want the AI to run on the same VM (no separate Ollama host):

- **ARM 6 GB VM** is better for running Ollama (Phi-3.5 or similar). On the VM:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull phi3.5
ollama serve   # or run under systemd / pm2 so it stays up
```

- In the app’s `.env` on the VM, either leave `OLLAMA_BASE_URL` unset (default `http://localhost:11434`) or set `OLLAMA_BASE_URL=http://127.0.0.1:11434`. The word-gen server and Ollama both run on the same machine.

If the VM has limited RAM, use a small model (e.g. phi3.5) and expect the first “mini” call (1 word × 19 categories) to return in tens of seconds; full run (phase 1 + 19 fill calls) will take longer in the background.

---

## 4. Production checklist (besides Oracle hosting)

- **Environment**
  - No secrets in code. Use env vars for Firebase config, `VITE_WORDGEN_API_URL`, and any API keys. On Oracle VM, use `.env` or the platform’s env config; for the hosted UI, set `VITE_*` at build time in your hosting (Vercel, Netlify, etc.).

- **Frontend (hosted UI)**
  - Build: `npm run build`. Deploy the `dist/` output to Vercel, Netlify, Firebase Hosting, or similar.
  - Set `VITE_WORDGEN_API_URL` to your Oracle word-gen server URL (e.g. `http://<public-ip>:3001`) so the site talks to your global API.

- **Word-gen API (Oracle VM)**
  - Listen on `0.0.0.0` (Express does by default). Open only port 3001 (or 80) in the Oracle security list.
  - CORS: the server already allows `*`; for production you can restrict `Access-Control-Allow-Origin` to your frontend origin (e.g. `https://your-app.vercel.app`).
  - Optional: put **nginx** (or Caddy) in front: listen 80/443, proxy to `http://127.0.0.1:3001`, add HTTPS with Let’s Encrypt so the UI can call `https://your-domain.com` instead of `http://<ip>:3001`.

- **Firebase**
  - Use a production project; set security rules and indexes for real usage. Keep Firebase config in env only.

- **Reliability**
  - Use **pm2** (or systemd) so the word-gen server restarts on crash and survives reboot.
  - If Ollama is on the same VM, run it under systemd or pm2 as well.

- **Security**
  - Prefer HTTPS for the frontend and, if you add a domain, for the word-gen API (reverse proxy + TLS).
  - Restrict CORS to your frontend origin in production.
  - Keep the Oracle VM updated (`apt update && apt upgrade`).

---

## 5. Summary

| Goal | What to do |
|------|------------|
| Host word-gen server globally | Create an Oracle Always Free VM, install Node, run `wordGenServer.ts` (e.g. with pm2), open port 3001. |
| Attach to hosted UI | Set `VITE_WORDGEN_API_URL` to `http://<VM-public-ip>:3001` (or your HTTPS URL) and rebuild/deploy the frontend. |
| Run AI on Oracle | Install Ollama on the same VM, pull phi3.5, run `ollama serve`; word-gen server uses default `OLLAMA_BASE_URL`. |
| Production | Env-only config, build UI, deploy UI + API, CORS, optional HTTPS reverse proxy, pm2/systemd, Firebase production project. |
