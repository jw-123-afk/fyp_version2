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

# 6. Point exactly to your app factory function!
ENV FLASK_APP="app:create_app()"

# 7. Set Render's default port
ENV PORT=10000
EXPOSE 10000

# 8. Start the app USING CONDA RUN to ensure the environment is active
CMD ["conda", "run", "--no-capture-output", "-n", "base", "flask", "run", "--host=0.0.0.0", "--port=10000"]