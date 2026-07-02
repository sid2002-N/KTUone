#!/bin/bash
# Persistent dev-server launcher. Uses setsid + nohup + disown to fully
# detach from the parent shell so the server survives the bash session.

cd /home/z/my-project

# Kill any prior dev server
pkill -f "next dev" 2>/dev/null
sleep 1

# Fully unset the stale shell DB env vars so .env.local can take effect.
# Next.js's dotenv loader does NOT override existing process.env values.
setsid nohup env -u DATABASE_URL -u DIRECT_URL \
  npx next dev -p 3000 > dev.log 2>&1 < /dev/null &
DEV_PID=$!
disown $DEV_PID 2>/dev/null

# Wait for "Ready" or failure
for i in $(seq 1 60); do
  if grep -q "Ready in" dev.log 2>/dev/null; then
    echo "Dev server ready (PID $DEV_PID)"
    # Verify it's actually still alive
    if kill -0 $DEV_PID 2>/dev/null; then
      echo "Process alive"
      exit 0
    else
      echo "Process died immediately after Ready"
      cat dev.log
      exit 1
    fi
  fi
  if ! kill -0 $DEV_PID 2>/dev/null; then
    echo "Process died during startup"
    cat dev.log
    exit 1
  fi
  sleep 0.5
done
echo "Dev server did not become ready in 30s"
cat dev.log
exit 1
