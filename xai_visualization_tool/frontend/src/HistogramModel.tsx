import {useEffect, useRef, type FC} from 'react';
import * as d3 from 'd3';
import {ExtendedHistogramBin, HistogramModalProps} from './types';

interface EnhancedHistogramModalProps extends HistogramModalProps {
    layerIndex?: number;
    neuronIndex?: number;
}

// Debug logging function
const debugLog = (message: string, data?: any) => {
    console.log(`[HistogramModel Debug] ${message}`, data);
}

const HistogramModel: FC<EnhancedHistogramModalProps> = ({
                                                             data,
                                                             onClose,
                                                             layerIndex,
                                                             neuronIndex
                                                         }) => {
    const modalRef = useRef(null);

    // Log all props received
    debugLog('Component Mounted', {
        data,
        layerIndex,
        neuronIndex
    });

    useEffect(() => {
        // Extensive logging for debugging
        debugLog('Use Effect Triggered', {
            modalRefCurrent: !!modalRef.current,
            dataValues: data.values,
            dataValuesLength: data.values?.length,
            dataTargets: data.targets
        });

        if (!modalRef.current) {
            debugLog('Modal Ref is NULL');
            return;
        }

        // Ensure d3 rendering only happens if there are values
        if (!data.values || data.values.length === 0) {
            debugLog('No values to render');
            return;
        }

        d3.select(modalRef.current).selectAll("*").remove();

        const margin = {top: 20, right: 30, bottom: 40, left: 50};
        const width = 500;
        const height = 350;

        const svg = d3.select(modalRef.current)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const values = data.values;
        const targets = data.targets || [];

        const histogram = d3.bin()
            .thresholds(20)(values);

        const xScale = d3.scaleLinear()
            .domain([d3.min(values) || 0, d3.max(values) || 1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(histogram, d => d.length) || 0])
            .range([height, 0]);

        // Render histogram based on targets
        debugLog('Preparing to render histogram', {
            valuesLength: values.length,
            targetsLength: targets.length
        });

        if (targets && targets.length > 0) {
            const class0Data = values.filter((_, i) => targets[i] === 0);
            const class1Data = values.filter((_, i) => targets[i] === 1);

            debugLog('Class Data', {
                class0DataLength: class0Data.length,
                class1DataLength: class1Data.length
            });

            const hist0 = d3.bin().thresholds(20)(class0Data);
            const hist1 = d3.bin().thresholds(20)(class1Data);

            // Render Class 0 (Red) histogram
            svg.selectAll('.class0-bar')
                .data(hist0)
                .enter()
                .append('rect')
                .attr('class', 'histogram-bar class0-bar')
                .attr('x', d => xScale(d.x0 || 0))
                .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
                .attr('y', d => yScale(d.length))
                .attr('height', d => height - yScale(d.length))
                .style('fill', 'red')
                .style('opacity', 0.6);

            // Render Class 1 (Blue) histogram
            svg.selectAll('.class1-bar')
                .data(hist1)
                .enter()
                .append('rect')
                .attr('class', 'histogram-bar class1-bar')
                .attr('x', d => xScale(d.x0 || 0))
                .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
                .attr('y', d => yScale(d.length))
                .attr('height', d => height - yScale(d.length))
                .style('fill', 'blue')
                .style('opacity', 0.6);
        } else {
            // Fallback for no targets
            svg.selectAll('.histogram-bar')
                .data(histogram)
                .enter()
                .append('rect')
                .attr('class', 'histogram-bar')
                .attr('x', d => xScale(d.x0 || 0))
                .attr('width', d => Math.max(0, xScale(d.x1 || 0) - xScale(d.x0 || 0) - 1))
                .attr('y', d => yScale(d.length))
                .attr('height', d => height - yScale(d.length))
                .style('fill', '#4f9deb')
                .style('opacity', 0.8);
        }

        // X-axis
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.format('.2f'));

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .append('text')
            .attr('x', width / 2)
            .attr('y', 35)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Value');

        // Y-axis
        const yAxis = d3.axisLeft(yScale)
            .ticks(8);

        svg.append('g')
            .call(yAxis)
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -height / 2)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Frequency');

    }, [data]);

    // Prevent closing when clicking inside the modal
    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="histogram-modal-overlay" onClick={onClose}>
            <div
                className="histogram-modal-content"
                onClick={handleContentClick}
            >
                <button
                    className="close-button"
                    onClick={onClose}
                >
                    &times;
                </button>
                <h2>
                    Neuron Distribution
                    {layerIndex !== undefined && neuronIndex !== undefined
                        ? ` - Layer ${layerIndex}, Neuron ${neuronIndex}`
                        : ''}
                </h2>
                <div ref={modalRef}></div>
            </div>
        </div>
    );
};

export default HistogramModel;