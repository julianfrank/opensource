declare my_array

add_item() {
        read -p "Enter item to add: " item
        # add item to array
        my_array+=("$item")
        echo "Item '$item' added to array."
        display_array
}

delete_item() {
    display_array
    read -p "Enter index of item to delete: " index
    if [[ -v "my_array[$index]" ]]; then
        unset my_array["$index"]
        echo "Array Item in index '$index' deleted."
    else
        echo "Array Item in index '$index' not found."
    fi
    display_array
}

display_array() {
  # echo "$my_array"
  local i=0  # Initialize index counter
  for each in "${my_array[@]}"; do
    echo "$i: $each"  # Print index and item
    ((i++))  # Increment index counter
  done
}


while true; do
    echo "1. Add item to array"
    echo "2. Delete item"
    echo "3. Display array items"
    echo "4. Exit"
    read -p "Enter your choice: " choice

    case "$choice" in
        1) add_item ;;
        2) delete_item ;;
        3) display_array ;;
        4) break ;;
        *) echo "Invalid choice." ;;
    esac
done
