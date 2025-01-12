"""
Neural Network Visualization Server

A FastAPI application that provides endpoints for neural network visualization,
handling model and activation file uploads, and network structure analysis.

Features:
- Model file upload (.pt/.pth)
- Activation data upload (.pt/.pth)
- Network structure analysis
- Example file loading
- CORS support for frontend integration
"""

import os
from pathlib import Path
from typing import Dict, List, Optional

import torch
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil


class NetworkAnalyzer:
    """Handles neural network analysis and structure extraction."""

    @staticmethod
    def analyze_model_structure(state_dict: Dict) -> List[Dict]:
        """
        Analyzes the structure of a neural network from its state dictionary.

        Args:
            state_dict: PyTorch state dictionary containing model parameters

        Returns:
            List of dictionaries containing layer information
        """
        layers = []
        for key, tensor in state_dict.items():
            if "weight" not in key:
                continue

            layer_num = int(key.split(".")[1])
            shape = tensor.shape

            # Determine layer type and create layer info
            if layer_num == 0:
                layers.append(
                    {"name": "Input Layer", "neurons": shape[1], "layer_type": "input"}
                )
                layers.append(
                    {
                        "name": f"Hidden Layer 1",
                        "neurons": shape[0],
                        "layer_type": "hidden",
                    }
                )
            elif layer_num == 4:
                layers.append(
                    {
                        "name": "Output Layer",
                        "neurons": shape[0],
                        "layer_type": "output",
                    }
                )
            else:
                layers.append(
                    {
                        "name": f"Hidden Layer {layer_num}",
                        "neurons": shape[0],
                        "layer_type": "hidden",
                    }
                )

        return layers


class FileHandler:
    """Manages file operations for model and activation data."""

    def __init__(self):
        self.upload_dir = Path("/tmp")
        # Get the parent directory of the backend folder (project root)
        self.root_dir = Path(__file__).parent.parent
        self.example_files = {
            "model": self.root_dir / "linear_correlated_model.pt",
            "activations": self.root_dir / "acts_linear_correlated_model.pt",
        }

    async def save_upload(self, file: UploadFile, file_type: str) -> Path:
        """Saves an uploaded file to the temporary directory."""
        file_path = self.upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        return file_path

    def copy_example_files(self) -> Dict[str, Path]:
        """Copies example files to the temporary directory."""
        paths = {}
        try:
            print("Looking for files in:", self.root_dir)  # Debug print
            for file_type, src_path in self.example_files.items():
                print(f"Checking for {file_type} file at: {src_path}")  # Debug print
                if not src_path.exists():
                    raise FileNotFoundError(f"Example file not found: {src_path}")

                dest_path = self.upload_dir / src_path.name
                print(f"Copying to: {dest_path}")  # Debug print

                # Ensure the temp directory exists
                self.upload_dir.mkdir(parents=True, exist_ok=True)

                # Copy the file
                shutil.copy(str(src_path), str(dest_path))
                paths[file_type] = dest_path

            return paths
        except Exception as e:
            print(f"Error during file copy: {str(e)}")  # Debug print
            raise


class NNVisualizationServer:
    """Main server class handling API endpoints and visualization logic."""

    def __init__(self):
        self.app = FastAPI(
            title="Neural Network Visualization Server",
            description="API for neural network visualization and analysis",
        )
        self.file_handler = FileHandler()
        self.network_analyzer = NetworkAnalyzer()
        self.model_path: Optional[Path] = None
        self.activations_path: Optional[Path] = None

        # Configure CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )

        self.register_routes()

    def register_routes(self):
        """Registers all API routes."""

        @self.app.post("/upload_model/")
        async def upload_model(file: UploadFile = File(...)):
            """Handles model file upload."""
            self.model_path = await self.file_handler.save_upload(file, "model")
            return {"filename": file.filename}

        @self.app.post("/upload_activations/")
        async def upload_activations(file: UploadFile = File(...)):
            """Handles activation file upload."""
            self.activations_path = await self.file_handler.save_upload(
                file, "activations"
            )
            return {"filename": file.filename}

        @self.app.get("/use_example/")
        async def use_example_files():
            """Loads example model and activation files."""
            try:
                print("Current working directory:", os.getcwd())  # Debug print
                paths = self.file_handler.copy_example_files()
                self.model_path = paths["model"]
                self.activations_path = paths["activations"]
                return {"message": "Example files loaded successfully"}
            except Exception as e:
                print(f"Error in use_example_files: {str(e)}")  # Debug print
                import traceback

                print(traceback.format_exc())  # Print full traceback
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/")
        async def analyze_network():
            """
            Analyzes network structure and activations.
            Returns combined model structure and activation data.
            """
            if not self.model_path or not self.activations_path:
                raise HTTPException(
                    status_code=404, detail="Model or activation files not found"
                )

            try:
                # Load model and activations
                model = torch.load(self.model_path, map_location=torch.device("cpu"))
                activations = torch.load(
                    self.activations_path, map_location=torch.device("cpu")
                )

                # Extract state dictionary
                state_dict = (
                    model.get("state_dict", model)
                    if isinstance(model, dict)
                    else model.state_dict()
                )

                # Analyze model structure
                network_structure = self.network_analyzer.analyze_model_structure(
                    state_dict
                )

                # Process activations
                processed_activations = []
                if isinstance(activations, torch.Tensor):
                    processed_activations = activations.tolist()
                elif isinstance(activations, list):
                    processed_activations = [
                        tensor.tolist() if isinstance(tensor, torch.Tensor) else tensor
                        for tensor in activations
                    ]

                return {
                    "model_structure": network_structure,
                    "activations": processed_activations,
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))


# Initialize server
server = NNVisualizationServer()
app = server.app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
