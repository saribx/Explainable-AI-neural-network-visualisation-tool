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
from typing import Dict, List, Optional, Tuple
import traceback

import torch
import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil


class NetworkAnalyzer:
    """
    Handles neural network analysis and structure extraction.
    Provides methods for analyzing network architecture, extracting weights,
    and preparing visualization data for both activations and edge weights.
    """

    @staticmethod
    def analyze_model_structure(
            state_dict: Dict,
    ) -> Tuple[List[Dict], List[np.ndarray]]:
        """
        Analyzes the structure of a neural network and extracts weight matrices.

        Args:
            state_dict: PyTorch state dictionary containing model parameters

        Returns:
            Tuple containing:
            - List of dictionaries containing layer information
            - List of weight matrices between layers
        """
        layers = []
        weight_matrices = []

        # Extract all weight keys and sort them
        weight_keys = sorted(
            [k for k in state_dict.keys() if "weight" in k],
            key=lambda x: int(x.split(".")[1]),
        )

        # Process each weight matrix
        for idx, key in enumerate(weight_keys):
            tensor = state_dict[key]
            shape = tensor.shape
            weight_matrix = tensor.detach().numpy()
            weight_matrices.append(weight_matrix)

            # Add layer information
            if idx == 0:
                # Input layer
                layers.append(
                    {"name": "Input Layer", "neurons": shape[1], "layer_type": "input"}
                )
                # First hidden layer
                layers.append(
                    {
                        "name": f"Hidden Layer 1",
                        "neurons": shape[0],
                        "layer_type": "hidden",
                    }
                )
            elif idx == len(weight_keys) - 1:
                # Output layer
                layers.append(
                    {
                        "name": "Output Layer",
                        "neurons": shape[0],
                        "layer_type": "output",
                    }
                )
            else:
                # Additional hidden layers
                layers.append(
                    {
                        "name": f"Hidden Layer {idx + 1}",
                        "neurons": shape[0],
                        "layer_type": "hidden",
                    }
                )

        return layers, weight_matrices

    @staticmethod
    def process_network_data(state_dict: Dict, activations: List) -> Dict:
        """
        Processes both network structure and data for visualization.

        Args:
            state_dict: PyTorch state dictionary containing model parameters
            activations: List of activation values for each layer

        Returns:
            Dictionary containing model structure, activations, and weight matrices
        """
        layers, weight_matrices = NetworkAnalyzer.analyze_model_structure(state_dict)

        # Process weight matrices into visualization format
        processed_weights = []
        for matrix in weight_matrices:
            processed_weights.append(matrix.tolist())

        # Find global min/max weight values für die Legende
        weight_min = float('inf')
        weight_max = float('-inf')
        for matrix in weight_matrices:
            matrix_min = matrix.min()
            matrix_max = matrix.max()
            weight_min = min(weight_min, matrix_min)
            weight_max = max(weight_max, matrix_max)

        return {
            "model_structure": layers,
            "activations": activations,
            "weight_matrices": processed_weights,
            "weight_range": {  # Min/max values for weight matrix legend (color scale)
                "min": float(weight_min),
                "max": float(weight_max)
            }
        }


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
            print("Looking for files in:", self.root_dir)
            for file_type, src_path in self.example_files.items():
                print(f"Checking for {file_type} file at: {src_path}")
                if not src_path.exists():
                    raise FileNotFoundError(f"Example file not found: {src_path}")

                dest_path = self.upload_dir / src_path.name
                print(f"Copying to: {dest_path}")

                self.upload_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy(str(src_path), str(dest_path))
                paths[file_type] = dest_path

            return paths
        except Exception as e:
            print(f"Error during file copy: {str(e)}")
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
        self.current_dataset = None

    async def analyze_network(self):
        try:
            model = torch.load(self.model_path, map_location=torch.device("cpu"))
            activations = torch.load(self.activations_path, map_location=torch.device("cpu"))

            # Create activation info string
            if isinstance(activations, dict):
                activation_info = f"Dictionary format: {str(activations)[:2000]}"
            elif isinstance(activations, list):
                activation_info = f"List format: {str(activations)[:2000]}"
            elif isinstance(activations, torch.Tensor):
                activation_info = f"Tensor format: {str(activations.tolist())[:2000]}"
            else:
                activation_info = f"Other format ({type(activations)}): {str(activations)[:2000]}"

            state_dict = model.get("state_dict", model) if isinstance(model, dict) else model.state_dict()
            node_node = None  # Initialize node_node at the top level

            processed_activations = []
            if isinstance(activations, dict):
                act_data = activations["activations"]
                targets = activations.get("targets", None)
                node_node = activations.get("node_node", None)

                processed_activations = [
                    {
                        "values": tensor.tolist() if isinstance(tensor, torch.Tensor) else tensor,
                        "targets": targets.tolist() if isinstance(targets, torch.Tensor) else targets
                    }
                    for tensor in act_data
                ]
            elif isinstance(activations, list):
                processed_activations = [
                    {
                        "values": tensor.tolist() if isinstance(tensor, torch.Tensor) else tensor,
                        "targets": None
                    }
                    for tensor in activations
                ]

            visualization_data = self.network_analyzer.process_network_data(state_dict, processed_activations)

            # Process node_node if available
            if node_node is not None:
                node_node_matrices = [matrix.tolist() if isinstance(matrix, torch.Tensor) else matrix
                                      for matrix in node_node]
                if node_node is not None:
                    print("Node-node structure:", type(node_node))
                    print("First node-node matrix shape:", node_node[0].shape)
                    try:
                        node_node_matrices = []
                        node_node_min = float('inf')
                        node_node_max = float('-inf')

                        for i, matrix in enumerate(node_node):
                            # Ensure the matrix is converted to a list with numeric values
                            if isinstance(matrix, torch.Tensor):
                                matrix = matrix.detach().cpu().numpy().tolist()

                            # Recursive function to flatten and convert to floats
                            def flatten_and_convert(item):
                                if isinstance(item, list):
                                    return [flatten_and_convert(subitem) for subitem in item]
                                return float(item)

                            # Flatten and convert the matrix
                            converted_matrix = flatten_and_convert(matrix)

                            # Find min and max in flattened list
                            def find_min_max(lst):
                                min_val = float('inf')
                                max_val = float('-inf')

                                def recursive_traverse(item):
                                    nonlocal min_val, max_val
                                    if isinstance(item, list):
                                        for subitem in item:
                                            recursive_traverse(subitem)
                                    else:
                                        min_val = min(min_val, item)
                                        max_val = max(max_val, item)

                                recursive_traverse(lst)
                                return min_val, max_val

                            matrix_min, matrix_max = find_min_max(converted_matrix)

                            # Update global min and max
                            node_node_min = min(node_node_min, matrix_min)
                            node_node_max = max(node_node_max, matrix_max)

                            # Store the converted matrix
                            node_node_matrices.append(converted_matrix)

                        print(f"Node-node Min/Max values: {node_node_min}, {node_node_max}")
                        visualization_data["node_node_matrices"] = node_node_matrices
                        visualization_data["node_node_range"] = {
                            "min": float(node_node_min),
                            "max": float(node_node_max)
                        }
                    except Exception as e:
                        print("Error in node_node processing:", str(e))
                        print(traceback.format_exc())

            visualization_data["activation_info"] = activation_info

            return visualization_data

        except Exception as e:
            print("Error details:", traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))

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
                print("Current working directory:", os.getcwd())
                paths = self.file_handler.copy_example_files()
                self.model_path = paths["model"]
                self.activations_path = paths["activations"]
                return {"message": "Example files loaded successfully"}
            except Exception as e:
                print(f"Error in use_example_files: {str(e)}")
                import traceback

                print(traceback.format_exc())
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/")
        async def root():
            """Root endpoint that analyzes network structure and returns visualization data."""
            return await self.analyze_network()

        @self.app.post("/upload_dataset/")
        async def upload_dataset(file: UploadFile = File(...)):
            """Handles dataset file upload and analyzes its structure."""
            try:
                file_path = await self.file_handler.save_upload(file, "dataset")
                dataset = torch.load(file_path)
                self.current_dataset = dataset  # Store dataset for later use

                # Analyze dataset structure
                splits = {}
                first_element = None
                dimensions = None

                for split in ['train', 'test', 'val']:
                    key = f'x_{split}'
                    if key in dataset and isinstance(dataset[key], torch.Tensor):
                        tensor_shape = dataset[key].shape
                        splits[split] = {
                            'shape': list(tensor_shape),
                            'available': True
                        }

                        # Get first element and dimensions from train set if available
                        if split == 'train' and first_element is None:
                            # Get first element
                            first_tensor = dataset[key][0]
                            # If it's 1D, try to determine if it should be square
                            if len(first_tensor.shape) == 1:
                                size = int(np.sqrt(first_tensor.shape[0]))
                                # If it's a perfect square
                                if size * size == first_tensor.shape[0]:
                                    dimensions = [size, size]
                                    first_element = first_tensor.detach().cpu().numpy().tolist()
                            else:
                                dimensions = list(first_tensor.shape)
                                first_element = first_tensor.detach().cpu().numpy().tolist()

                print(f"Dimensions: {dimensions}")  # Debug print
                print(f"First element shape: {len(first_element)}")  # Debug print

                return {
                    'splits': splits,
                    'currentElement': first_element,
                    'dimensions': dimensions
                }

            except Exception as e:
                print("Error processing dataset:", str(e))
                import traceback
                print(traceback.format_exc())
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/get_dataset_element/")
        async def get_dataset_element(split: str, index: int):
            """Retrieves a specific element from the dataset."""
            try:
                if not hasattr(self, 'current_dataset'):
                    raise HTTPException(status_code=404, detail="No dataset loaded")

                dataset = self.current_dataset
                key = f'x_{split}'

                if key not in dataset:
                    raise HTTPException(status_code=404, detail=f"Split {split} not found")

                data = dataset[key]
                if not 0 <= index < len(data):
                    raise HTTPException(status_code=400, detail="Index out of range")

                element = data[index]
                # Handle reshaping if needed
                if len(element.shape) == 1:
                    size = int(np.sqrt(element.shape[0]))
                    if size * size == element.shape[0]:
                        dimensions = [size, size]
                    else:
                        dimensions = [1, element.shape[0]]
                else:
                    dimensions = list(element.shape)

                return {
                    'element': element.detach().cpu().numpy().tolist(),
                    'dimensions': dimensions
                }

            except Exception as e:
                print("Error retrieving element:", str(e))
                print(traceback.format_exc())
                raise HTTPException(status_code=500, detail=str(e))


# Initialize server
server = NNVisualizationServer()
app = server.app

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
