// Set dimensions
const width = 900;
const height = 900;

// Load CSV
d3.csv("train.csv").then(data => {

  // Remove any unnamed index column
  data = data.filter(d => d["track_name"]); // skip empty rows

  // Build hierarchy: Genre -> Artist -> Track (size = popularity)
const hierarchyData = { name: "Spotify", children: [] };

const genreMap = d3.group(data, d => d.track_genre);

genreMap.forEach((genreTracks, genre) => {
  const genreNode = { name: genre, children: [] };

  const artistMap = d3.group(genreTracks, d => d.artists);

  // Convert to array and compute average popularity
  let artistArray = Array.from(artistMap, ([artist, tracks]) => {
    return {
      name: artist,
      value: d3.mean(tracks, d => +d.popularity)
    };
  });

  artistArray = artistArray
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  genreNode.children = artistArray;

  hierarchyData.children.push(genreNode);
});

  // Create circle packing layout
  const root = d3.pack()
    .size([width - 2, height - 2])
    .padding(3)(
      d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value)
    );

  const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

const color = d3.scaleOrdinal(d3.schemeCategory10);

const node = svg.selectAll("g")
  .data(root.descendants())
  .join("g")
  .attr("transform", d => `translate(${d.x},${d.y})`);

node.append("circle")
  .attr("r", d => d.r)
  .attr("fill", d => {
    if (d.depth === 0) return "#ffffff"; // root (invisible)
    if (d.depth === 1) return color(d.data.name); // genre
    if (d.depth === 2) return d3.color(color(d.parent.data.name)).brighter(0.8); // artist (lighter shade)
  })
  .attr("stroke", "#000");

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

node.on("mouseover", (event, d) => {
  tooltip.transition().duration(200).style("opacity", 0.9);

  tooltip.html(`
    <strong>${d.data.name}</strong>
    ${d.value ? `<br>Popularity: ${d.value.toFixed(1)}` : ""}
  `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
})
.on("mouseout", () => {
  tooltip.transition().duration(300).style("opacity", 0);
});
});