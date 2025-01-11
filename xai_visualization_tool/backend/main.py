"""
Neural Network Visualization Server

This FastAPI server handles model and activation file uploads, processes them,
and provides network structure and activation data for visualization.

The server supports:
- Model file upload (.pt/.pth files)
- Activation data upload (.pt/.pth files)
- Network structure analysis
- Example file loading
"""

import torch
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Dict, List, Optional
import shutil

class NNVisualizationServer:
    def __init__(self):
        self.app = FastAPI(title="Neural Network Visualization Server")
        self.model_file_path: Optional[str] = None
        self.activations_file_path: Optional[str] = None
        self.example_files = {
            "model": "linear_correlated_model.pt",
            "activations": "acts_linear_correlated_model.pt"
        }

        # Configure CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Register routes
        self.register_routes()

    def register_routes(self):
        """Register all API routes"""
        self.app.post("/upload_model/")(self.upload_model)
        self.app.post("/upload_activations/")(self.upload_activations)
        self.app.get("/use_example/")(self.use_example_files)
        self.app.get("/")(self.analyze_network)

    def analyze_model_structure(self, state_dict: Dict) -> Dict:
        """
        Analyze neural network structure from state dictionary.

        Args:
            state_dict: PyTorch state dictionary containing model parameters

        Returns:
            Dict containing network layer structure
        """
        layers = []
        for key, tensor in state_dict.items():
            if 'weight' in key:
                layer_num = int(key.split('.')[1])
                shape = tensor.shape

                if layer_num == 0:  # Input layer
                    layers.append({
                        "name": "Input Layer",
                        "neurons": int(shape[1]),
                        "layer_type": "input"
                    })
                    layers.append({
                        "name": f"Hidden Layer 1",
                        "neurons": int(shape[0]),
                        "layer_type": "hidden"
                    })
                elif layer_num == 4:  # Output layer
                    layers.append({
                        "name": "Output Layer",
                        "neurons": int(shape[0]),
                        "layer_type": "output"
                    })
                else:  # Hidden layers
                    layers.append({
                        "name": f"Hidden Layer {layer_num}",
                        "neurons": int(shape[0]),
                        "layer_type": "hidden"
                    })

        return {"network_structure": layers}

    async def upload_model(self, file: UploadFile = File(...)):
        """Handle model file upload"""
        self.model_file_path = f"/tmp/{file.filename}"
        with open(self.model_file_path, "wb") as buffer:
            buffer.write(await file.read())
        return {"filename": file.filename}

    async def upload_activations(self, file: UploadFile = File(...)):
        """Handle activations file upload"""
        self.activations_file_path = f"/tmp/{file.filename}"
        with open(self.activations_file_path, "wb") as buffer:
            buffer.write(await file.read())
        return {"filename": file.filename}

    async def use_example_files(self):
        """Load example model and activation files"""
        try:
            # Copy example files to temp directory
            for file_type, filename in self.example_files.items():
                dest_path = f"/tmp/{filename}"
                shutil.copy(filename, dest_path)
                if file_type == "model":
                    self.model_file_path = dest_path
                else:
                    self.activations_file_path = dest_path
            return {"message": "Example files loaded successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def analyze_network(self):
        """
        Analyze network structure and activations.
        Returns combined model structure and activation data.
        """
        if not all([self.model_file_path, self.activations_file_path]):
            raise HTTPException(status_code=404, detail="Model or activation files not found")

        try:
            # Load model and activations
            model = torch.load(self.model_file_path, map_location=torch.device('cpu'))
            activations = torch.load(self.activations_file_path, map_location=torch.device('cpu'))

            # Extract state dictionary
            state_dict = model.get('state_dict', model) if isinstance(model, dict) else model.state_dict()

            # Analyze model structure
            model_structure = self.analyze_model_structure(state_dict)

            # Process activations
            activations_list = []
            if isinstance(activations, torch.Tensor):
                activations_list = activations.tolist()
            elif isinstance(activations, list):
                activations_list = [
                    tensor.tolist() if isinstance(tensor, torch.Tensor) else tensor
                    for tensor in activations
                ]

            return {
                "model_structure": model_structure["network_structure"],
                "activations": activations_list
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# Initialize server
server = NNVisualizationServer()
app = server.app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)