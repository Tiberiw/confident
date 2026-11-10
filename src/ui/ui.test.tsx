import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, DataTable, Dialog, Input, Tabs } from "@/ui";

it("Button with loading is disabled and shows a spinner", () => {
  render(<Button loading>Save</Button>);
  const btn = screen.getByRole("button", { name: /save/i });
  expect(btn).toBeDisabled();
  expect(btn.querySelector('[role="status"]')).not.toBeNull();
});

describe("Dialog", () => {
  it("renders nothing when closed", () => {
    render(<Dialog open={false} onClose={() => {}} title="Delete patient">Body</Dialog>);
    expect(screen.queryByText("Delete patient")).toBeNull();
  });

  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Delete patient">Body</Dialog>);
    expect(screen.getByRole("dialog", { name: "Delete patient" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("DataTable", () => {
  const columns = [{ key: "name", header: "Name", render: (r: { id: string; name: string }) => r.name }];

  it("renders the empty node without rows", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} empty={<p>No patients yet</p>} />);
    expect(screen.getByText("No patients yet")).toBeInTheDocument();
  });

  it("calls onRowClick with the row", async () => {
    const onRowClick = vi.fn();
    const row = { id: "1", name: "Maria Ionescu" };
    render(<DataTable columns={columns} rows={[row]} rowKey={(r) => r.id} onRowClick={onRowClick} empty={null} />);
    await userEvent.click(screen.getByText("Maria Ionescu"));
    expect(onRowClick).toHaveBeenCalledWith(row);
  });
});

it("Input with an error is marked invalid and shows the message", () => {
  render(<Input label="First name" error="Required" />);
  expect(screen.getByLabelText("First name")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("Required")).toBeInTheDocument();
});

it("Tabs calls onChange with the tab id", async () => {
  const onChange = vi.fn();
  render(<Tabs tabs={[{ id: "a", label: "Cases" }, { id: "b", label: "New case" }]} value="a" onChange={onChange} />);
  await userEvent.click(screen.getByRole("tab", { name: "New case" }));
  expect(onChange).toHaveBeenCalledWith("b");
});
