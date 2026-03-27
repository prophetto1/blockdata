#!/usr/bin/env python3
import os
import sys

def generate_tree(directory, prefix="", exclude_dirs=None):
    if exclude_dirs is None:
        exclude_dirs = set()
    
    items = []
    try:
        items = sorted(os.listdir(directory))
    except PermissionError:
        return ""
    
    # Filter out excluded directories and hidden files
    items = [item for item in items if not item.startswith('.') and item not in exclude_dirs]
    
    tree_str = ""
    
    for index, item in enumerate(items):
        path = os.path.join(directory, item)
        is_last_item = index == len(items) - 1
        
        # Create the tree branch characters
        connector = "└── " if is_last_item else "├── "
        tree_str += f"{prefix}{connector}{item}\n"
        
        # Recursively handle directories
        if os.path.isdir(path) and item not in exclude_dirs:
            extension = "    " if is_last_item else "│   "
            tree_str += generate_tree(path, prefix + extension, exclude_dirs)
    
    return tree_str

def main():
    # Define directories to exclude
    exclude = {'venv', 'docs', '__pycache__', '.git', 'node_modules', '.pytest_cache', '.mypy_cache', 'datasets', 'references'}
    
    # Get the current directory
    root_dir = os.getcwd()
    
    # Generate the tree
    print(f"Generating tree for: {root_dir}")
    print(f"Excluding: {', '.join(exclude)}")
    print()
    
    tree_content = f"# Repository Structure\n\n"
    tree_content += f"Generated from: `{root_dir}`\n\n"
    tree_content += f"```\n"
    tree_content += f"{os.path.basename(root_dir)}/\n"
    tree_content += generate_tree(root_dir, "", exclude)
    tree_content += f"```\n"
    
    # Ensure the output directory exists
    output_dir = os.path.join(root_dir, "docs", "onboarding")
    os.makedirs(output_dir, exist_ok=True)
    
    # Write to the markdown file
    output_path = os.path.join(output_dir, "1.2. Tree.md")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(tree_content)
    
    print(f"\nTree saved to: {output_path}")

if __name__ == "__main__":
    main()