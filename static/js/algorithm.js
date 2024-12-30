document.getElementById('generateDataBtn').addEventListener('click', function() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            visualizeData(data);
        });
});

function visualizeData(data) {
    const svg = d3.select('#visualization');
    svg.selectAll('*').remove();  

    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };

    const x = d3.scaleBand()
        .domain(d3.range(data.length))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    svg.attr("width", width)
       .attr("height", height);

    svg.selectAll(".bar")
       .data(data)
       .enter().append("rect")
       .attr("class", "bar")
       .attr("x", (d, i) => x(i))
       .attr("y", d => y(d))
       .attr("width", x.bandwidth())
       .attr("height", d => height - margin.bottom - y(d));

    svg.append("g")
       .selectAll(".x-axis")
       .data([0])
       .enter()
       .append("line")
       .attr("x1", 0)
       .attr("x2", width)
       .attr("y1", height - margin.bottom)
       .attr("y2", height - margin.bottom)
       .attr("stroke", "black");
};
