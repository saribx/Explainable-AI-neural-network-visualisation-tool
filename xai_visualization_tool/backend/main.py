import torch
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI()
origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model_file_path = None
activations_file_path = None

@app.post("/upload_model/")
async def upload_model(file: UploadFile = File(...)):
    global model_file_path
    model_file_path = f"/tmp/{file.filename}"
    with open(model_file_path, "wb") as buffer:
        buffer.write(file.file.read())
    return {"filename": file.filename}

@app.post("/upload_activations/")
async def upload_activations(file: UploadFile = File(...)):
    global activations_file_path
    activations_file_path = f"/tmp/{file.filename}"
    with open(activations_file_path, "wb") as buffer:
        buffer.write(file.file.read())
    return {"filename": file.filename}

@app.get("/")
async def root():
    if not model_file_path or not os.path.exists(model_file_path):
        raise HTTPException(status_code=404, detail="Model file not found")

    if not activations_file_path or not os.path.exists(activations_file_path):
        raise HTTPException(status_code=404, detail="Activations file not found")

    model = torch.load(model_file_path, map_location=torch.device('cpu'))
    activations = torch.load(activations_file_path, map_location=torch.device('cpu'))

    if isinstance(model, dict):
        state_dict = model.get('state_dict', model)
    else:
        state_dict = model.state_dict()

    layers = []
    for name, param in state_dict.items():
        if 'weight' in name:
            shape = param.shape
            if len(shape) >= 2:
                layers.append({
                    'name': name.split('.weight')[0],
                    'type': 'Linear' if len(shape) == 2 else 'Conv',
                    'input_size': int(shape[1]),
                    'output_size': int(shape[0])
                })

    activations_list = [param.tolist() for param in activations]

    return {
        "layers": layers,
        "activations": activations_list
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)