@echo off
REM Supabase Database Setup - Run this locally or in CI
REM Prerequisites: Supabase CLI installed (npx supabase)

echo ================================================
echo  SUPER AGENT - DATABASE SETUP
echo ================================================
echo.

setlocal

set /p PROJECT_REF="Enter Supabase Project Ref (from Settings → API): "
if "%PROJECT_REF%"=="" (
    echo ❌ Project Ref is required
    exit /b 1
)

echo.
echo 🚀 Running database schema...
echo.

npx supabase db push --project-ref %PROJECT_REF%

if %errorlevel% equ 0 (
    echo.
    echo ✅ Database schema deployed successfully!
    echo.
    echo 📋 Next steps:
    echo    1. Go to https://%PROJECT_REF%.supabase.co
    echo    2. Check Table Editor for new tables:
    echo       - agent_state
    echo       - agent_memories
    echo       - scheduled_tasks
    echo       - upgrade_history
    echo       - agent_logs
    echo       - skills_registry
    echo       - triggers_registry
    echo    3. Deploy Edge Functions:
    echo       npx supabase functions deploy self-upgrade --project-ref %PROJECT_REF%
    echo       npx supabase functions deploy agent-core --project-ref %PROJECT_REF%
) else (
    echo.
    echo ❌ Database setup failed. Check errors above.
)

endlocal
pause
