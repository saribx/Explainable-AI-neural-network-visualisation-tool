import {BrowserRouter as Router, Route, Routes, Link} from 'react-router-dom';
import {useState} from 'react';
import './App.css';
import api from './api';
import NNdrawer from "./NNdrawer.tsx";
import DatasetPreview from './DatasetPreview';
import ModelNetworkVisualizer from './modelNNVisualizer.tsx';

// Viridis color mapping function
const getViridisColor = (value) => {
    const colors = [
        [68, 1, 84],       // Dark purple
        [70, 50, 127],     // Purple
        [59, 82, 139],     // Blue
        [33, 144, 141],    // Teal
        [93, 201, 99],     // Green
        [253, 231, 37]     // Yellow
    ];

    const v = Math.max(0, Math.min(1, value));
    const numSegments = colors.length - 1;
    const segment = Math.min(Math.floor(v * numSegments), numSegments - 1);
    const segmentT = (v * numSegments) - segment;

    const c1 = colors[segment];
    const c2 = colors[segment + 1];

    const r = Math.round(c1[0] + (c2[0] - c1[0]) * segmentT);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * segmentT);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * segmentT);

    return `rgb(${r}, ${g}, ${b})`;
};

function App() {
    const [isModelFileUploaded, setIsModelFileUploaded] = useState(false);
    const [isActFileUploaded, setIsActFileUploaded] = useState(false);
    const [file, setFile] = useState(null);
    const [Afile, setAFile] = useState(null);
    const [visualizationData, setVisualizationData] = useState(null);
    const [error, setError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState({model: false, act: false});
    const [datasetPreview, setDatasetPreview] = useState(null);

    async function handleModelFileInput(e) {
        const files = e.target.files;
        if (files) {
            setFile(files[0]);
            setIsModelFileUploaded(true);
            const formData = new FormData();
            formData.append('file', files[0]);
            try {
                await api.post('/upload_model/', formData, {
                    headers: {'Content-Type': 'multipart/form-data'}
                });
                setError(null);
                setUploadSuccess(prev => ({...prev, model: true}));
            } catch (err) {
                setError(`Error uploading model file: ${err.message}`);
                console.error('Model upload error:', err);
            }
        }
    }

    async function handleActFileInput(e) {
        const Afiles = e.target.files;
        if (Afiles) {
            setAFile(Afiles[0]);
            setIsActFileUploaded(true);
            const formData = new FormData();
            formData.append('file', Afiles[0]);
            try {
                await api.post('/upload_activations/', formData, {
                    headers: {'Content-Type': 'multipart/form-data'}
                });
                setError(null);
                setUploadSuccess(prev => ({...prev, act: true}));
            } catch (err) {
                setError(`Error uploading activation file: ${err.message}`);
                console.error('Activation upload error:', err);
            }
        }
    }

    function handleModelUploadButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';
        input.onchange = handleModelFileInput;
        input.click();
    }

    function handleActUploadButtonClick() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';
        input.onchange = handleActFileInput;
        input.click();
    }

    async function handleLoadExample() {
        try {
            const response = await api.get('/use_example/');
            if (response.data.message === 'Example files loaded successfully') {
                setIsModelFileUploaded(true);
                setIsActFileUploaded(true);
                setFile({name: 'linear_correlated_model.pt'});
                setAFile({name: 'acts_linear_correlated_model.pt'});
                setError(null);
                setUploadSuccess({model: true, act: true});
            }
        } catch (err) {
            setError(`Error loading example files: ${err.message}`);
            console.error('Example files error:', err);
        }
    }

    async function handleVisualizeButtonClick() {
        try {
            const response = await api.get('/');
            setVisualizationData(response.data);
            setError(null);
        } catch (err) {
            setError(`Error fetching visualization data: ${err.message}`);
            console.error('Visualization error:', err);
        }
    }

    return (
        <Router>
            <nav className="navbar">
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/create_NN">Create NN</Link></li>
                </ul>
            </nav>

            <Routes>
                <Route path="/" element={
                    <>
                        <h1 className="H">XAI NN Visualization Tool</h1>
                        <h3>Upload your trained model and its activations to visualize your neural network</h3>

                        <div className="code-block">
                            <p>With the simple upload of your trained model and its activations saved as .pt file</p>
                            <p>you can see the activations visually with histograms inside neurons</p>
                            <p>and the edge colors show connection strength between neurons.</p>
                            <p>You can visualize weights from either:</p>
                            <code>
                                1. Model weights (default)<br/>
                                2. Node-to-node connections (if provided in acts.pt)<br/>
                                <br/>
                                Color coding:<br/>
                                <span style={{color: '#ff0000'}}>Red</span>: Strong positive/excitatory connection<br/>
                                <span style={{color: '#0000ff'}}>Blue</span>: Strong negative/inhibitory connection<br/>
                                <span style={{color: '#ffffff'}}>White</span>: Weak/no connection<br/>
                            </code>
                            <p></p>
                            <p>To generate the activations you can use the following code:</p>
                            <code>
                                <span className="keyword">acts</span> = <span
                                className="function">collect_activation</span>(model_linear_correlated_data,
                                model_linear_correlated_data_dict[&quot;x_train&quot;])<br/>
                                <span className="function">torch.save</span>(acts, &apos;activations.pt&apos;)
                            </code>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button onClick={handleLoadExample} className="upload-button">
                            <svg className="example-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <path d="M3 16l5-5 4 4 5.5-5.5"/>
                                <circle cx="17.5" cy="8.5" r="1.5"/>
                            </svg>
                            Load Example Files
                            {uploadSuccess.model && uploadSuccess.act && (
                                <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                        </button>

                        <DatasetPreview onDatasetLoaded={setDatasetPreview}/>

                        <button onClick={handleModelUploadButtonClick} className="upload-button">
                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Upload Model
                            {uploadSuccess.model && (
                                <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                        </button>
                        {isModelFileUploaded && file && (
                            <p className="upload-text">File Uploaded: {file.name}</p>
                        )}

                        <button onClick={handleActUploadButtonClick} className="upload-button">
                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Data to visualize
                            {uploadSuccess.act && (
                                <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                        </button>
                        {isActFileUploaded && Afile && (
                            <p className="upload-text">File Uploaded: {Afile.name}</p>
                        )}

                        <button
                            onClick={handleVisualizeButtonClick}
                            className={`upload-button ${isActFileUploaded && isModelFileUploaded ? 'activated' : 'non-activated'}`}
                            disabled={!isActFileUploaded || !isModelFileUploaded}>
                            Visualize
                        </button>

                        {visualizationData && (
                            <>
                                <div className="code-block">
                                    <h4>Model Structure:</h4>
                                    <pre>{JSON.stringify(visualizationData.model_structure, null, 2)}</pre>
                                    <h4>Data Availability:</h4>
                                    <pre>
                                        {`Activations: ✓ Available
                                            Targets: ${visualizationData.activations[0].targets ? '✓ Available' : '✗ Not Available'}
                                            Node-Node Connections: ${visualizationData.node_node_matrices ? '✓ Available' : '✗ Not Available'}`}
                                    </pre>
                                    <h4>Activation Data Structure:</h4>
                                    <pre>{visualizationData.activation_info}</pre>
                                </div>
                                <ModelNetworkVisualizer
                                    visualizationData={visualizationData}
                                    firstLayerData={datasetPreview}
                                    getViridisColor={getViridisColor}
                                />
                            </>
                        )}
                    </>
                }/>

                <Route path="/create_NN" element={
                    <div className="create-nn-container">
                        <h1 className="H">Create Neural Network</h1>
                        <NNdrawer/>
                    </div>
                }/>
            </Routes>
        </Router>
    );
}

export default App;