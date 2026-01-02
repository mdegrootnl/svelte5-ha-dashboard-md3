import sys
import re
import argparse

def inject_svelte_component(file_path, component_name, import_path, usage_code):
    """
    Surgically injects a component import and usage into a Svelte file.
    """
    try:
        with open(file_path, 'r') as f:
            content = f.read()

        # 1. Inject Import
        # Regex to find the <script> block (handling lang="ts")
        script_pattern = r'<script.*?>'
        
        # Check if import already exists to avoid duplication
        if not re.search(f'import.*{component_name}', content):
            match = re.search(script_pattern, content)
            if match:
                # Insert after <script> opening tag
                insertion_point = match.end()
                import_stmt = f'\n\timport {{ {component_name} }} from "{import_path}";'
                content = content[:insertion_point] + import_stmt + content[insertion_point:]
            else:
                # Create script block if missing
                content = f'<script lang="ts">\n\timport {{ {component_name} }} from "{import_path}";\n</script>\n' + content
        
        # 2. Inject Usage (Append to end or specific marker)
        # Simple strategy: Append to template
        # In a real scenario, this could use a marker or sophisticated parsing
        content += f'\n{usage_code}'
        
        with open(file_path, 'w') as f:
            f.write(content)
            
        print(f"Success: Injected {component_name} into {file_path}")
        return "Injection successful"

    except Exception as e:
        print(f"Error: {str(e)}")
        return f"Error executing injection: {str(e)}"

if __name__ == "__main__":
    # Argument parsing logic for CLI execution
    parser = argparse.ArgumentParser(description='Surgically inject a Svelte component.')
    parser.add_argument('file_path', help='Path to the target Svelte file')
    parser.add_argument('component_name', help='Name of the component to import')
    parser.add_argument('import_path', help='Import path for the component')
    parser.add_argument('usage_code', help='The Svelte template code to append')

    args = parser.parse_args()
    
    inject_svelte_component(args.file_path, args.component_name, args.import_path, args.usage_code)