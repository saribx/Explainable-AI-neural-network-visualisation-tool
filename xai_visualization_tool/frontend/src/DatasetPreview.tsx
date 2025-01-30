import * as React from 'react';
import api from './api';
import './App.css';

interface DatasetPreviewProps {
    className?: string;
    onDatasetLoaded?: (data: number[]) => void;
}

interface DatasetInfo {
    splits: {
        [key: string]: { shape: number[], available: boolean }
    };
    currentElement: number[];
    dimensions: number[];
}

// RGB color type definitions for color interpolation
type RGBColor = [number, number, number];
type ColorMatrix = RGBColor[];

// Calculates interpolated RGB color values based on input and color matrix
const calculateColorTransition = (v: number, colors: ColorMatrix): RGBColor => {
    const numSegments = colors.length - 1;
    const segment = Math.min(Math.floor(v * numSegments), numSegments - 1);
    const segmentT = (v * numSegments) - segment;
    const c1 = colors[segment];
    const c2 = colors[segment + 1];

    return [
        Math.round(c1[0] + (c2[0] - c1[0]) * segmentT),
        Math.round(c1[1] + (c2[1] - c1[1]) * segmentT),
        Math.round(c1[2] + (c2[2] - c1[2]) * segmentT)
    ];
};

const DatasetPreview: React.FC<DatasetPreviewProps> = ({className, onDatasetLoaded}) => {
    const [uploadSuccess, setUploadSuccess] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [datasetInfo, setDatasetInfo] = React.useState<DatasetInfo | null>(null);
    const [selectedSplit, setSelectedSplit] = React.useState<'train' | 'test' | 'val'>('train');
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);

    // Maps numeric values to RGB colors using warm-cold color scheme
    const getColor = React.useCallback((value: number): string => {
        // Normalisiere zu [-1,1] und dann zu [0,1]
        const normalized = (Math.max(-1, Math.min(1, value * 1.5)) + 1) / 2;

        const colors: ColorMatrix = [
            [65, 105, 175],    // Gedämpftes Blau (stark negativ)
            [130, 150, 200],   // Helles Blau (leicht negativ)
            [178, 178, 182],   // Fast Grau (null) - leicht bläulich/rötlich
            [200, 140, 140],   // Helles Rot (leicht positiv)
            [175, 95, 95]      // Gedämpftes Rot (stark positiv)
        ];

        const [r, g, b] = calculateColorTransition(normalized, colors);
        return `rgb(${r}, ${g}, ${b})`;
    }, []);

    // Converts array into grid format based on dimensions
    const reshapeToGrid = React.useCallback((data: number[], dims: number[]): number[][] => {
        if (!Array.isArray(data)) {
            console.error('Invalid data format:', data);
            return [[0]];
        }

        const [height, width] = dims;
        const grid: number[][] = [];
        for (let i = 0; i < height; i++) {
            grid.push(data.slice(i * width, (i + 1) * width));
        }
        return grid;
    }, []);

    // Fetches a specific element from the dataset
    const fetchDatasetElement = React.useCallback(async (split: string, index: number) => {
        try {
            const response = await api.get(`/get_dataset_element/`, {
                params: {split, index}
            });

            if (response.data.element) {
                setDatasetInfo(prev => prev ? {
                    ...prev,
                    currentElement: response.data.element
                } : null);
                onDatasetLoaded?.(response.data.element);
            }
        } catch (err: any) {
            setError(`Error fetching dataset element: ${err.message}`);
        }
    }, [onDatasetLoaded]);

    // Handles file input events and performs API upload
    const handleDatasetFileInput = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            const formData = new FormData();
            formData.append('file', files[0]);

            api.post('/upload_dataset/', formData, {
                headers: {'Content-Type': 'multipart/form-data'}
            }).then((response: { data: DatasetInfo }) => { // Added response type
                setError(null);
                setUploadSuccess(true);
                setDatasetInfo(response.data);
                if (response.data.currentElement) {
                    onDatasetLoaded?.(response.data.currentElement);
                }
            }).catch((err: Error) => {
                console.error('Dataset upload error:', err);
                setError(`Error uploading dataset file: ${err.message}`);
            });

        }
    }, [onDatasetLoaded]);

    // Creates and triggers file input for dataset upload
    const handleDatasetUploadButtonClick = React.useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pt, .pth';
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target && target.files) {
                handleDatasetFileInput({
                    target,
                    currentTarget: target,
                } as React.ChangeEvent<HTMLInputElement>);
            }
        };
        input.click();
    }, [handleDatasetFileInput]);

    // Handle split change
    const handleSplitChange = React.useCallback((split: 'train' | 'test' | 'val') => {
        if (datasetInfo?.splits[split]?.available) {
            setSelectedSplit(split);
            setSelectedIndex(0);
            fetchDatasetElement(split, 0).catch(err =>
                setError(`Error changing split: ${err.message}`)
            );
        }
    }, [datasetInfo, fetchDatasetElement]);

    // Handle index change
    const handleIndexChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const maxIndex = (datasetInfo?.splits[selectedSplit]?.shape[0] || 1) - 1;

        // Handle empty input or backspace on single digit
        if (inputValue === '') {
            setSelectedIndex(0);
            fetchDatasetElement(selectedSplit, 0).catch(err =>
                setError(`Error changing index: ${err.message}`)
            );
            return;
        }

        // Remove leading zeros
        const normalizedValue = inputValue.replace(/^0+/, '');
        const index = parseInt(normalizedValue || '0', 10);

        if (index >= 0 && index <= maxIndex) {
            setSelectedIndex(index);
            fetchDatasetElement(selectedSplit, index).catch(err =>
                setError(`Error changing index: ${err.message}`)
            );
        }
    }, [datasetInfo, selectedSplit, fetchDatasetElement]);

    // Add function to handle key press
    const handleKeyPress = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent default behavior for arrow keys to avoid cursor movement
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
        }
    }, []);

    return (
        <div className={`dataset-preview-container ${className || ''}`}>
            <button onClick={handleDatasetUploadButtonClick} className="upload-button">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Upload Dataset
                {uploadSuccess && (
                    <svg className="success-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                )}
            </button>

            {datasetInfo && (
                <div className="dataset-controls">
                    <div className="split-buttons">
                        {(['train', 'test', 'val'] as const).map(split => {
                            const info = datasetInfo.splits[split];
                            if (!info) return null;

                            return (
                                <button
                                    key={split}
                                    onClick={() => handleSplitChange(split)}
                                    className={`split-button ${!info.available ? 'disabled' : ''} ${selectedSplit === split ? 'active' : ''}`}
                                    disabled={!info.available}
                                >
                                    {split}
                                    <div style={{fontSize: '0.75rem', opacity: 0.8}}>({info.shape[0]})</div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="index-control">
                        <input
                            type="number"
                            min={0}
                            max={(datasetInfo.splits[selectedSplit]?.shape[0] || 1) - 1}
                            value={selectedIndex}
                            onChange={handleIndexChange}
                            onKeyDown={handleKeyPress}
                            placeholder="Select element index..."
                            className="index-input"
                        />
                    </div>
                </div>
            )}

            {datasetInfo?.currentElement && (
                <div className="dataset-preview">
                    <h4>Element Preview: {selectedSplit} [{selectedIndex}]</h4>
                    <div className="preview-image">
                        {reshapeToGrid(datasetInfo.currentElement, datasetInfo.dimensions).map((row, i) => (
                            <div key={i} className="image-row">
                                {row.map((value, j) => (
                                    <div
                                        key={`${i}-${j}`}
                                        className="image-pixel"
                                        style={{
                                            backgroundColor: getColor(value),
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span style={{
                                            color: value > 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
                                            fontSize: '7px',
                                            userSelect: 'none'
                                        }}>
                                            {value.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="error-message">{error}</div>
            )}
        </div>
    );
};

export default DatasetPreview;