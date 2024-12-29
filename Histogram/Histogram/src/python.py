import torch
import json
import numpy as np

# Load the .pt file
tensor_data = torch.load("acts_linear_correlated.pt") 
model_data = torch.load("linear_1d1p_0.0125_correlated.pt")

# Extract the activation from the last layer (or desired layer)
activation_tensor = tensor_data[-1]

activation_one_tensor = activation_tensor[:,0]
t = model_data["y_train"]
t= torch.tensor(t)
act1 = activation_one_tensor[t==0]

# Convert the tensor to a list
activation_array = act1.numpy().tolist()

# Save the activations to a JSON file
with open("activations.json", "w") as json_file:
    json.dump(activation_array, json_file)

