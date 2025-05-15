# Ensure all necessary npm packages are installed
try {
    npm install
    Write-Host "Dependencies installed successfully."
} catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
}

# Build the Vite project
try {
    npm run build
    Write-Host "Project built successfully."
} catch {
    Write-Error "Build failed: $_"
    exit 1
}

# Add the build output to the repository
# Assuming the build output is in the 'dist' directory
Set-Location dist

# Initialize a new git repository in the dist directory
if (-Not (Test-Path ".git")) {
    try {
        git init
        Write-Host "Initialized new git repository in dist."
    } catch {
        Write-Error "Failed to initialize git repository: $_"
        exit 1
    }
}

# Add all files and commit
try {
    git add .
    git commit -m "Deploy to GitHub Pages"
    Write-Host "Changes committed successfully."
} catch {
    Write-Error "Failed to commit changes: $_"
    exit 1
}

# Push to the gh-pages branch
try {
    git push -f https://github.com/ArndRosemeier/Armchair-General.git master:gh-pages
    Write-Host "Pushed to gh-pages branch successfully."
} catch {
    Write-Error "Failed to push to gh-pages: $_"
    exit 1
}

# Return to the project root directory
Set-Location ..

Write-Host "Deployment to GitHub Pages completed." 