# 1. Use the Conda base image
FROM docker.io/condaforge/mambaforge:latest

# 2. Set the working directory
WORKDIR /usr/src/app

# 3. Copy the Conda shopping list
COPY environment.yml .

# 4. Install dependencies into the base environment
RUN conda env update -n base -f environment.yml

# 5. Copy your project code
COPY . /usr/src/app

# 6. Set Render's default port
ENV PORT=10000
EXPOSE 10000

# 7. Start the app using plain Python (The Nuclear Option)
CMD ["python", "-u", "run.py"]