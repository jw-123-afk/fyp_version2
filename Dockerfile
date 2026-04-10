# 1. Use the Conda base image (matching your WSL setup)
FROM docker.io/condaforge/mambaforge:latest

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy the Conda shopping list first
COPY environment.yml .

# 4. Install dependencies directly into the base environment
# (This prevents activation headaches inside Docker)
RUN conda env update -n base -f environment.yml

# 5. Copy the rest of your actual project code
COPY . /usr/src/app

# 6. Expose the port your Flask server runs on
EXPOSE 5000

# 7. Tell Docker exactly how to start your app
# NOTE: If your main file is named something else like 'run.py', change it here!
CMD ["python", "app.py"]