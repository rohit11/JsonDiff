import json
from deepdiff import DeepDiff
from jinja2 import Template

# Load JSON
with open('left.json') as f:
    left = json.load(f)

with open('right.json') as f:
    right = json.load(f)

# Perform structured diff
diff = DeepDiff(left, right, view='tree')

# Organize changes
changes = {
    'added': [],
    'removed': [],
    'changed': []
}

for change in diff.items:
    for item in diff[change]:
        if 'dictionary_item_added' in change:
            changes['added'].append(str(item.path()))
        elif 'dictionary_item_removed' in change:
            changes['removed'].append(str(item.path()))
        else:
            changes['changed'].append({
                'path': str(item.path()),
                'from': item.t1,
                'to': item.t2
            })

# HTML template
html_template = """
<html>
<head>
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #ccc; padding: 20px; }
    .added { background: #144212; color: #b5f1b5; padding: 4px; }
    .removed { background: #600; color: #fbb; padding: 4px; }
    .changed { background: #604000; color: #ffe5b4; padding: 4px; }
  </style>
</head>
<body>
  <h2>JSON Diff Report</h2>
  {% if changes.added %}
    <h3>Added</h3>
    <ul>{% for a in changes.added %}<li class="added">{{ a }}</li>{% endfor %}</ul>
  {% endif %}
  {% if changes.removed %}
    <h3>Removed</h3>
    <ul>{% for r in changes.removed %}<li class="removed">{{ r }}</li>{% endfor %}</ul>
  {% endif %}
  {% if changes.changed %}
    <h3>Changed</h3>
    <ul>
    {% for c in changes.changed %}
      <li class="changed">{{ c.path }}: {{ c.from }} → {{ c.to }}</li>
    {% endfor %}
    </ul>
  {% endif %}
</body>
</html>
"""

template = Template(html_template)
rendered_html = template.render(changes=changes)

with open("json_diff_final_report.html", "w") as f:
    f.write(rendered_html)

print("✅ Generated json_diff_final_report.html")