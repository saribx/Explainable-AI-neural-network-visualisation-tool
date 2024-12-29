import torch
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from typing import Dict, List

app = FastAPI()

# CORS Einstellungen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globale Variablen für Dateipfade
model_file_path = None
activations_file_path = None

def analyze_model_structure(state_dict: Dict) -> Dict:
    """
    Analysiert die Struktur des Neural Networks und gibt sie als Dictionary zurück
    """
    layers = []
    current_layer = 0

    for key, tensor in state_dict.items():
        if 'weight' in key:
            layer_num = int(key.split('.')[1])
            shape = tensor.shape

            # Layer-Informationen extrahieren
            if layer_num == 0:
                layers.append({
                    "name": "Input Layer",
                    "neurons": int(shape[1]),
                    "layer_type": "input"
                })
                layers.append({
                    "name": f"Hidden Layer {current_layer + 1}",
                    "neurons": int(shape[0]),
                    "layer_type": "hidden"
                })
            elif layer_num == 4:  # Output Layer
                layers.append({
                    "name": "Output Layer",
                    "neurons": int(shape[0]),
                    "layer_type": "output"
                })
            else:
                layers.append({
                    "name": f"Hidden Layer {current_layer + 1}",
                    "neurons": int(shape[0]),
                    "layer_type": "hidden"
                })
            current_layer += 1

    return {"network_structure": layers}

@app.post("/upload_model/")
async def upload_model(file: UploadFile = File(...)):
    """
    Endpoint zum Hochladen des Modells
    """
    global model_file_path
    model_file_path = f"/tmp/{file.filename}"
    with open(model_file_path, "wb") as buffer:
        buffer.write(file.file.read())
    return {"filename": file.filename}

@app.post("/upload_activations/")
async def upload_activations(file: UploadFile = File(...)):
    """
    Endpoint zum Hochladen der Aktivierungen
    """
    global activations_file_path
    activations_file_path = f"/tmp/{file.filename}"
    with open(activations_file_path, "wb") as buffer:
        buffer.write(file.file.read())
    return {"filename": file.filename}

@app.get("/")
async def root():
    """
    Hauptendpoint zur Analyse des Modells und der Aktivierungen
    """
    # Überprüfe ob die Dateien existieren
    if not model_file_path or not os.path.exists(model_file_path):
        raise HTTPException(status_code=404, detail="Model file not found")

    if not activations_file_path or not os.path.exists(activations_file_path):
        raise HTTPException(status_code=404, detail="Activations file not found")

    # Lade Modell und Aktivierungen
    model = torch.load(model_file_path, map_location=torch.device('cpu'))
    activations = torch.load(activations_file_path, map_location=torch.device('cpu'))

    # Extrahiere state_dict
    if isinstance(model, dict):
        state_dict = model.get('state_dict', model)
    else:
        state_dict = model.state_dict()

    # Analysiere Modellstruktur
    model_structure = analyze_model_structure(state_dict)

    # Konvertiere Aktivierungen in Liste (später kommentar weg nehmen!)
    #activations_list = [param.tolist() for param in activations]

    # Kombiniere alle Informationen
    return {
        "model_structure": model_structure["network_structure"],
        #(später kommentar weg nehmen!)
        #"activations": activations_list
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)